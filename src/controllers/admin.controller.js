const pool = require('../db');
const bcrypt = require('bcrypt');
const { v4: uuid } = require('uuid');
const crypto = require('crypto');

const jwt = require('../utils/jwt');

exports.login = async (req, res) => {
  const { username, password } = req.body;

  const result = await pool.query(
    'SELECT * FROM admins WHERE username = $1',
    [username]
  );

  if (result.rows.length === 0) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const admin = result.rows[0];
  // const isMatch = await bcrypt.compare(password, admin.password_hash);
  const isMatch = admin.password_hash === password; // TEMP: plain text password check


  if (!isMatch) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const token = jwt.generateToken({
  adminId: admin.id,
  churchId: admin.church_id,
  role: 'admin',
});

  res.json({ token });
};
exports.createEvent = async (req, res) => {
  const { name, event_date } = req.body;
  const churchId = req.user.churchId;

  const eventId = uuid();

  await pool.query(
    `INSERT INTO events (id, church_id, name, event_date)
     VALUES ($1, $2, $3, $4)`,
    [eventId, churchId, name, event_date]
  );

  res.json({ eventId });
};
exports.createService = async (req, res) => {
  const { event_id, service_code, service_time } = req.body;

  const serviceId = uuid();
  const qrToken = crypto.randomBytes(32).toString('hex');

  await pool.query(
    `INSERT INTO services 
     (id, event_id, service_code, service_time, qr_token)
     VALUES ($1, $2, $3, $4, $5)`,
    [serviceId, event_id, service_code, service_time, qrToken]
  );

  res.json({
    serviceId,
    qrUrl: `${process.env.BASE_URL}/api/register/metadata?token=${qrToken}`
  });
};
exports.listEvents = async (req, res) => {
  const churchId = req.user.churchId;

  const result = await pool.query(
    `SELECT 
        e.id,
        e.name,
        to_char(e.event_date, 'YYYY-MM-DD') AS event_date,
        COALESCE(
          json_agg(
            json_build_object(
                  'id', s.id,
                  'service_code', s.service_code,
                  'service_time', s.service_time,
                  'qr_token', s.qr_token
                ) ORDER BY s.service_time
          ) FILTER (WHERE s.id IS NOT NULL), '[]') AS services
     FROM events e
     LEFT JOIN services s ON s.event_id = e.id
     WHERE e.church_id = $1
     GROUP BY e.id
     ORDER BY e.event_date DESC`,
    [churchId]
  );

  const baseUrl = process.env.BASE_URL || '';

  const events = result.rows.map((e) => {
    // ensure services is an array
    const services = Array.isArray(e.services) ? e.services : [];

    e.services = services.map((s) => {
      // if qr_token present, build qrUrl
      if (s && s.qr_token) {
        return {
          id: s.id,
          service_code: s.service_code,
          service_time: s.service_time,
          qrUrl: `${baseUrl}/api/register/metadata?token=${s.qr_token}`,
        };
      }

      return s;
    });

    return e;
  });

  res.json(events);
};
exports.listEventsByDate = async (req, res) => {
  const churchId = req.user.churchId;
  const { date } = req.query; // expected format: YYYY-MM-DD

  if (!date) {
    return res.status(400).json({ message: 'Missing date parameter' });
  }

  const result = await pool.query(
    `SELECT 
        e.id,
        e.name,
        to_char(e.event_date, 'YYYY-MM-DD') AS event_date,
        COALESCE(
          json_agg(
            json_build_object(
                  'id', s.id,
                  'service_code', s.service_code,
                  'service_time', s.service_time,
                  'qr_token', s.qr_token
                ) ORDER BY s.service_time
          ) FILTER (WHERE s.id IS NOT NULL), '[]') AS services
     FROM events e
     LEFT JOIN services s ON s.event_id = e.id
     WHERE e.church_id = $1
       AND e.event_date::date = $2::date
     GROUP BY e.id
     ORDER BY e.event_date DESC`,
    [churchId, date]
  );

  const baseUrl = process.env.BASE_URL || '';

  const events = result.rows.map((e) => {
    const services = Array.isArray(e.services) ? e.services : [];

    e.services = services.map((s) => {
      if (s && s.qr_token) {
        return {
          id: s.id,
          service_code: s.service_code,
          service_time: s.service_time,
          qrUrl: `${baseUrl}/api/register/metadata?token=${s.qr_token}`,
        };
      }

      return s;
    });

    return e;
  });

  res.json(events);
};
exports.listServices = async (req, res) => {
  const { eventId } = req.params;

  const result = await pool.query(
    `SELECT id, service_code, service_time
     FROM services
     WHERE event_id = $1
     ORDER BY service_time`,
    [eventId]
  );

  res.json(result.rows);
};
exports.attendanceByService = async (req, res) => {
  const { serviceId } = req.params;

  const result = await pool.query(
    `SELECT 
        m.full_name,
        m.phone,
        r.submitted_at
     FROM registrations r
     JOIN members m ON r.member_id = m.id
     WHERE r.service_id = $1
     ORDER BY r.submitted_at`,
    [serviceId]
  );

  res.json({
    count: result.rows.length,
    attendees: result.rows
  });
};
exports.attendanceByEvent = async (req, res) => {
  const { eventId } = req.params;

  const result = await pool.query(
    `SELECT 
        s.service_code,
        s.service_time,
        COUNT(r.id) AS count
     FROM services s
     LEFT JOIN registrations r ON s.id = r.service_id
     WHERE s.event_id = $1
     GROUP BY s.id
     ORDER BY s.service_time`,
    [eventId]
  );

  res.json(result.rows);
};
const { Parser } = require('json2csv');

exports.exportAttendanceCSV = async (req, res) => {
  const { eventId } = req.params;

  const result = await pool.query(
    `SELECT 
        e.name AS event_name,
        e.event_date,
        s.service_code,
        s.service_time,
        m.full_name,
        m.phone,
        r.submitted_at
     FROM registrations r
     JOIN services s ON r.service_id = s.id
     JOIN events e ON s.event_id = e.id
     JOIN members m ON r.member_id = m.id
     WHERE e.id = $1
     ORDER BY s.service_time, r.submitted_at`,
    [eventId]
  );

  const parser = new Parser();
  const csv = parser.parse(result.rows);

  res.header('Content-Type', 'text/csv');
  res.attachment(`attendance-${eventId}.csv`);
  res.send(csv);
};


