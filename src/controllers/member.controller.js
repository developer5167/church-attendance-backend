const pool = require("../db");
const jwt = require("../utils/jwt");
const otpUtil = require("../utils/otp");
const { v4: uuid } = require("uuid");
const { sendOtpSms } = require("../utils/twilioSms");

// exports.sendOtp = async (req, res) => {
//   const { phone } = req.body;

//   const otp = otpUtil.generateOtp();

//   // TEMP: log OTP
//   console.log(`OTP for ${phone}: ${otp}`);

//   res.json({ message: "OTP sent" });
// };

// exports.verifyOtp = async (req, res) => {
//   const { phone, otp } = req.body;

//   if (otp !== "123456") {
//     return res.status(400).json({ message: "Invalid OTP" });
//   }

//   let member = await pool.query("SELECT * FROM members WHERE phone = $1", [
//     phone,
//   ]);

//   if (member.rows.length === 0) {
//     member = await pool.query(
//       "INSERT INTO members (phone) VALUES ($1) RETURNING *",
//       [phone]
//     );
//   }

//   const token = jwt.generateToken({
//     memberId: member.rows[0].id,
//     churchId: member.rows[0].church_id,
//     role: "member",
//   });

//   res.json({ token });
// };
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
    return res.status(404).json({ message: "Invalid or expired QR" });
  }

  const service = result.rows[0];
  const now = new Date();

  // ❗ Block early (wrong date)
  const today = now.toISOString().split("T")[0];
  if (today !== service.event_date) {
    return res.status(400).json({
      message: "Registration not open for this date",
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
      message: "Registration closed for this service",
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
  const { full_name, coming_from, since_year, member_type, attending_with,baptised,email,gender,baptised_year } =
    req.body;
  const memberId = req.user.memberId;
  const result = await pool.query(`SELECT id FROM members WHERE id = $1`, [
    memberId,
  ]);
  try {
    if (result.rows.length === 0) {
    await pool.query(
      `INSERT INTO members
     (id, full_name, coming_from, since_year, member_type, attending_with,baptised,email,gender,baptised_year)
     VALUES ($1, $2, $3, $4, $5, $6,$7,$8,$9,$10)`,
      [
        memberId,
        full_name,
        coming_from,
        since_year,
        member_type,
        attending_with,
        baptised,
        email,
        gender,baptised_year
         ]
    );
  } else {
    await pool.query(
      `UPDATE members
     SET full_name=$1, coming_from=$2, since_year=$3,
         member_type=$4, attending_with=$5, last_updated=NOW(),baptised=$7,email=$8,gender=$9,baptised_year=$10
     WHERE id=$6`,
      [
        full_name,
        coming_from,
        since_year,
        member_type,
        attending_with,
        memberId,
        baptised,
        email,
        gender,
        baptised_year
      ]
    );
  }
  res.json({ message: "Profile updated" });
 } catch (err) {
    console.error("Error saving profile:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
  

  
};

exports.getProfile = async (req, res) => {
  const memberId = req.user?.memberId;
  const result = await pool.query(
    `SELECT full_name, coming_from, since_year, member_type, attending_with,gender,email,baptised,baptised_year
       FROM members
       WHERE id = $1`,
    [memberId]
  );
  return res.json(result.rows[0]);
};

// Get payment link for the member's church
exports.getPaymentLink = async (req, res) => {
  let churchId = req.user.churchId;
  const memberId = req.user.memberId;

  // If token didn't include churchId, try to look it up from members table
  if (!churchId && memberId) {
    const m = await pool.query("SELECT church_id FROM members WHERE id = $1", [
      memberId,
    ]);
    if (m.rows.length > 0) churchId = m.rows[0].church_id;
  }

  if (!churchId) {
    return res.status(404).json({ message: "Church not found for member" });
  }

  const result = await pool.query(
    "SELECT payment_link FROM churches WHERE id = $1",
    [churchId]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ message: "Church not found" });
  }

  res.json({ paymentLink: result.rows[0].payment_link || null });
};

// exports.sendOtp = async (req, res) => {
//   const { phone } = req.body;

//   const otp = otpUtil.generateOtp();
//   const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 min

//   await pool.query(
//     `INSERT INTO otps (id, phone, otp, expires_at)
//      VALUES ($1, $2, $3, $4)`,
//     [uuid(), phone, otp, expiresAt]
//   );

//   // TEMP: log OTP (later SMS)
//   console.log(`OTP for ${phone}: ${otp}`);

//   res.json({ message: "OTP sent" });
// };


//twilio integration
exports.sendOtp = async (req, res) => {
  const { phone } = req.body;

  const otp = otpUtil.generateOtp();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

  await pool.query(
    `INSERT INTO otps (id, phone, otp, expires_at)
     VALUES ($1, $2, $3, $4)`,
    [uuid(), phone, otp, expiresAt]
  );

  try {
    await sendOtpSms(phone, otp);
    res.json({ message: "OTP sent" });
  } catch (err) {
    console.error("Twilio error:", err.message);
    res.status(500).json({ message: "Failed to send OTP" });
  }
};
exports.verifyOtp = async (req, res) => {
  const { phone, otp, churchId: churchIdFromBody } = req.body;
  const result = await pool.query(
    `SELECT * FROM otps
     WHERE phone = $1 AND otp = $2
     ORDER BY created_at DESC
     LIMIT 1`,
    [phone, otp]
  );

  if (result.rows.length === 0) {
    return res.status(400).json({ message: "Invalid OTP" });
  }

  const record = result.rows[0];

  if (record.verified) {
    return res.status(400).json({ message: "OTP already used" });
  }

  if (new Date() > record.expires_at) {
    // remove expired OTP record
    await pool.query(`DELETE FROM otps WHERE id = $1`, [record.id]);
    return res.status(400).json({ message: "OTP expired" });
  }

  // Successful verification: remove OTPs for this phone to prevent reuse
  await pool.query(`DELETE FROM otps WHERE phone = $1`, [phone]);

  // validate provided churchId (if any)
  let churchIdFinal = null;
  if (churchIdFromBody) {
    const ch = await pool.query("SELECT id FROM churches WHERE id = $1", [
      churchIdFromBody,
    ]);
    if (ch.rows.length === 0) {
      return res.status(400).json({ message: "Invalid churchId" });
    }
    churchIdFinal = ch.rows[0].id;
  }

  // create or fetch member
  let member = await pool.query("SELECT * FROM members WHERE phone = $1", [
    phone,
  ]);

  if (member.rows.length === 0) {
    // create new member, attach church if provided
    member = await pool.query(
      `INSERT INTO members (id, phone, church_id)
       VALUES ($1, $2, $3) RETURNING *`,
      [uuid(), phone, churchIdFinal]
    );
  } else {
    // existing member: if they don't have a church and one was provided, persist it
    const existing = member.rows[0];
    if (!existing.church_id && churchIdFinal) {
      const updated = await pool.query(
        "UPDATE members SET church_id = $1 WHERE id = $2 RETURNING *",
        [churchIdFinal, existing.id]
      );
      member = updated;
    }
  }

  const token = jwt.generateToken({
    memberId: member.rows[0].id,
    churchId: member.rows[0].church_id,
    role: "member",
  });

  console.log(token);

  res.json({ token });
};

exports.requestBaptism = async (req, res) => {
  const memberId = req.user.memberId;

  try {
    // Check if member already has a pending baptism request
    const existingRequest = await pool.query(
      'SELECT * FROM baptism_requests WHERE member_id = $1 AND completed_at IS NULL',
      [memberId]
    );

    if (existingRequest.rows.length > 0) {
      return res.status(400).json({ message: 'You already have a pending baptism request' });
    }

    // Create new baptism request
    const result = await pool.query(
      `INSERT INTO baptism_requests (member_id)
       VALUES ($1)
       RETURNING id, member_id, created_at, completed_at`,
      [memberId]
    );

    res.status(201).json({ 
      message: 'Baptism request submitted successfully',
      request: result.rows[0]
    });
  } catch (err) {
    console.error('Error creating baptism request:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.getBaptismRequestStatus = async (req, res) => {
  const memberId = req.user.memberId;

  try {
    // Get member's baptism request (pending or completed)
    const result = await pool.query(
      `SELECT id, member_id, created_at, completed_at
       FROM baptism_requests
       WHERE member_id = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [memberId]
    );

    if (result.rows.length === 0) {
      return res.json({ 
        hasRequest: false,
        request: null
      });
    }

    const request = result.rows[0];
    const isPending = request.completed_at === null;

    res.json({ 
      hasRequest: true,
      status: isPending ? 'pending' : 'completed',
      request: request
    });
  } catch (err) {
    console.error('Error fetching baptism request status:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};
