const pool = require("../db");
const jwt = require("../utils/jwt");
const otpUtil = require("../utils/otp");
const { v4: uuid } = require("uuid");

exports.sendOtp = async (req, res) => {
  const { phone } = req.body;

  const otp = otpUtil.generateOtp();

  // TEMP: log OTP
  console.log(`OTP for ${phone}: ${otp}`);

  res.json({ message: "OTP sent" });
};

exports.verifyOtp = async (req, res) => {
  const { phone, otp } = req.body;

  if (otp !== "123456") {
    return res.status(400).json({ message: "Invalid OTP" });
  }

  let member = await pool.query("SELECT * FROM members WHERE phone = $1", [
    phone,
  ]);

  if (member.rows.length === 0) {
    member = await pool.query(
      "INSERT INTO members (phone) VALUES ($1) RETURNING *",
      [phone]
    );
  }

  const token = jwt.generateToken({
    memberId: member.rows[0].id,
    churchId: member.rows[0].church_id,
    role: "member",
  });

  res.json({ token });
};
exports.getRegisterMetadata = async (req, res) => {
  const { token } = req.query;

  const result = await pool.query(
    `SELECT 
      s.id AS service_id,
      s.event_id,
      s.service_code,
      s.service_time,
        e.name,
        to_char(e.event_date, 'YYYY-MM-DD') AS event_date
     FROM services s
     JOIN events e ON s.event_id = e.id
     WHERE s.qr_token = $1
       AND s.is_active = true
       AND e.is_active = true`,
    [token]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ message: 'Invalid or expired QR' });
  }

  const service = result.rows[0];
  const now = new Date();

  // ❗ Block early (wrong date)
  const today = now.toISOString().split('T')[0];
  if (today !== service.event_date) {
    return res.status(400).json({
      message: 'Registration not open for this date',
    });
  }

  // 1️⃣ Get next service start
  const nextServiceResult = await pool.query(
    `SELECT service_time
     FROM services
     WHERE event_id = $1
       AND service_time > $2
       AND is_active = true
     ORDER BY service_time ASC
     LIMIT 1`,
    [service.event_id, service.service_time]
  );

  let registrationEndTime;

  if (nextServiceResult.rows.length > 0) {
    registrationEndTime = new Date(
      `${service.event_date}T${nextServiceResult.rows[0].service_time}`
    );
  } else {
    registrationEndTime = new Date(`${service.event_date}T23:59:59`);
  }

  // 2️⃣ Final cutoff check
  if (now > registrationEndTime) {
    return res.status(400).json({
      message: 'Registration closed for this service',
    });
  }

  // ✅ Valid
  res.json({
    serviceId: service.service_id,
    eventName: service.name,
    serviceTime: service.service_time,
    serviceCode: service.service_code,
    eventDate: service.event_date,
  });
};
exports.submitRegistration = async (req, res) => {
  const { serviceId, prayerRequest } = req.body;
  const memberId = req.user.memberId;

  try {
    await pool.query(
      `INSERT INTO registrations (id, member_id, service_id, prayer_request)
       VALUES ($1, $2, $3, $4)`,
      [uuid(), memberId, serviceId, prayerRequest || null]
    );

    res.json({ message: "Registration successful" });
  } catch (err) {
    return res.status(400).json({ message: "Already registered" });
  }
};

exports.saveProfile = async (req, res) => {
  const { full_name, coming_from, since_year, member_type, attending_with } =
    req.body;
  const memberId = req.user.memberId;

  await pool.query(
    `UPDATE members
     SET full_name=$1, coming_from=$2, since_year=$3,
         member_type=$4, attending_with=$5, last_updated=NOW()
     WHERE id=$6`,
    [full_name, coming_from, since_year, member_type, attending_with, memberId]
  );

  res.json({ message: "Profile updated" });
};
exports.getProfile = async (req, res) => {
  const memberId = req.user.memberId;

  const result = await pool.query(
    `SELECT full_name, coming_from, since_year, member_type, attending_with
     FROM members
     WHERE id = $1`,
    [memberId]
  );

  res.json(result.rows[0]);
};

exports.sendOtp = async (req, res) => {
  const { phone } = req.body;

  const otp = otpUtil.generateOtp();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 min

  await pool.query(
    `INSERT INTO otps (id, phone, otp, expires_at)
     VALUES ($1, $2, $3, $4)`,
    [uuid(), phone, otp, expiresAt]
  );

  // TEMP: log OTP (later SMS)
  console.log(`OTP for ${phone}: ${otp}`);

  res.json({ message: "OTP sent" });
};
exports.verifyOtp = async (req, res) => {
  const { phone, otp } = req.body;

  const result = await pool.query(
    `SELECT * FROM otps
     WHERE phone = $1 AND otp = $2 AND verified = false
     ORDER BY created_at DESC
     LIMIT 1`,
    [phone, otp]
  );

  if (result.rows.length === 0) {
    return res.status(400).json({ message: "Invalid OTP" });
  }

  const record = result.rows[0];

  if (new Date() > record.expires_at) {
    return res.status(400).json({ message: "OTP expired" });
  }

  await pool.query(`UPDATE otps SET verified = true WHERE id = $1`, [
    record.id,
  ]);

  // create or fetch member
  let member = await pool.query("SELECT * FROM members WHERE phone = $1", [
    phone,
  ]);

  if (member.rows.length === 0) {
    member = await pool.query(
      `INSERT INTO members (id, phone)
       VALUES ($1, $2) RETURNING *`,
      [uuid(), phone]
    );
  }

  const token = jwt.generateToken({
    memberId: member.rows[0].id,
    churchId: member.rows[0].church_id,
    role: "member",
  });

  res.json({ token });
};
