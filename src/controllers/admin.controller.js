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
        (SELECT COUNT(r2.id)
         FROM registrations r2
         JOIN services s2 ON r2.service_id = s2.id
         WHERE s2.event_id = e.id) AS total_attendees,
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
        (SELECT COUNT(r2.id)
         FROM registrations r2
         JOIN services s2 ON r2.service_id = s2.id
         WHERE s2.event_id = e.id) AS total_attendees,
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
// Get payment link for the admin's church
exports.getPaymentLink = async (req, res) => {
  const churchId = req.user.churchId;

  const result = await pool.query(
    'SELECT payment_link FROM churches WHERE id = $1',
    [churchId]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ message: 'Church not found' });
  }

  res.json({ paymentLink: result.rows[0].payment_link || null });
};

// Set (create/update) payment link for the admin's church
exports.setPaymentLink = async (req, res) => {
  const churchId = req.user.churchId;
  const { paymentLink } = req.body;

  if (typeof paymentLink !== 'string') {
    return res.status(400).json({ message: 'Missing or invalid paymentLink' });
  }

  const result = await pool.query(
    'UPDATE churches SET payment_link = $1 WHERE id = $2 RETURNING id, payment_link',
    [paymentLink, churchId]
  );

  if (result.rowCount === 0) {
    return res.status(404).json({ message: 'Church not found' });
  }

  res.json({ paymentLink: result.rows[0].payment_link });
};
exports.attendanceByService = async (req, res) => {
  const { serviceId } = req.params;

  const result = await pool.query(
    `SELECT 
        m.*,
        r.submitted_at,
        r.prayer_request
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

// Delete an event only if there are no attendees registered for any of its services
exports.deleteEvent = async (req, res) => {
  const { eventId } = req.params;
  const churchId = req.user.churchId;

  // Ensure event belongs to the admin's church
  const eventCheck = await pool.query(
    'SELECT id FROM events WHERE id = $1 AND church_id = $2',
    [eventId, churchId]
  );

  if (eventCheck.rows.length === 0) {
    return res.status(404).json({ message: 'Event not found' });
  }

  // Check if there are any registrations for services under this event
  const regCount = await pool.query(
    `SELECT COUNT(r.id) AS cnt
     FROM services s
     JOIN registrations r ON r.service_id = s.id
     WHERE s.event_id = $1`,
    [eventId]
  );

  const count = parseInt(regCount.rows[0].cnt, 10) || 0;

  if (count > 0) {
    return res.status(400).json({ message: "Can't delete event: attendees exist" });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Delete services for the event (if any)
    await client.query('DELETE FROM services WHERE event_id = $1', [eventId]);

    // Delete the event
    const delRes = await client.query(
      'DELETE FROM events WHERE id = $1 AND church_id = $2 RETURNING id',
      [eventId, churchId]
    );

    await client.query('COMMIT');

    if (delRes.rowCount === 0) {
      return res.status(404).json({ message: 'Event not found or not authorized' });
    }

    return res.json({ message: 'Event deleted' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error deleting event:', err);
    return res.status(500).json({ message: 'Internal server error' });
  } finally {
    client.release();
  }
};

exports.completeBaptism = async (req, res) => {
  const { requestId } = req.params;
  const churchId = req.user.churchId;

  try {
    // Verify the baptism request exists and belongs to the admin's church
    const requestCheck = await pool.query(
      `SELECT br.* FROM baptism_requests br
       JOIN members m ON br.member_id = m.id
       WHERE br.id = $1 AND m.church_id = $2`,
      [requestId, churchId]
    );

    if (requestCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Baptism request not found or not authorized' });
    }

    if (requestCheck.rows[0].completed_at !== null) {
      return res.status(400).json({ message: 'Baptism request already completed' });
    }

    // Mark the baptism request as completed
    const result = await pool.query(
      `UPDATE baptism_requests
       SET completed_at = NOW()
       WHERE id = $1
       RETURNING id, member_id, created_at, completed_at`,
      [requestId]
    );

    res.json({ 
      message: 'Baptism marked as completed',
      request: result.rows[0]
    });
  } catch (err) {
    console.error('Error completing baptism:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.listBaptismRequests = async (req, res) => {
  const churchId = req.user.churchId;
  const { status } = req.query; // 'pending' or 'completed'

  try {
    let query = `
      SELECT 
        br.id,
        br.member_id,
        br.created_at,
        br.completed_at,
        m.full_name AS member_name,
        m.phone AS member_phone,
        m.email AS member_email
      FROM baptism_requests br
      JOIN members m ON br.member_id = m.id
      WHERE m.church_id = $1
    `;

    if (status === 'pending') {
      query += ' AND br.completed_at IS NULL';
    } else if (status === 'completed') {
      query += ' AND br.completed_at IS NOT NULL';
    }

    query += ' ORDER BY br.created_at DESC';

    const result = await pool.query(query, [churchId]);

    res.json({ requests: result.rows });
  } catch (err) {
    console.error('Error listing baptism requests:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};
exports.listVolunteerRequests = async (req, res) => {
  console.log("sdsad");
  
  try {
    const {
      departmentNameId,
      departmentId,
      status,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Validate pagination params
    const pageNum = parseInt(page, 10);
    const limitNum = Math.min(parseInt(limit, 10), 100);
    const offset = (pageNum - 1) * limitNum;

    // Validate sort params
    const allowedSortBy = ['createdAt', 'memberName'];
    const allowedSortOrder = ['asc', 'desc'];
    const sortColumn = allowedSortBy.includes(sortBy) ? sortBy : 'createdAt';
    const order = allowedSortOrder.includes(sortOrder) ? sortOrder.toUpperCase() : 'DESC';

    // Build WHERE clause
    let whereConditions = [];
    let queryParams = [];
    let paramCount = 1;

    if (departmentNameId) {
      whereConditions.push(`vad.department_name_id = $${paramCount}`);
      queryParams.push(departmentNameId);
      paramCount++;
    }

    if (departmentId) {
      whereConditions.push(`dn.department_id = $${paramCount}`);
      queryParams.push(departmentId);
      paramCount++;
    }

    if (status) {
      whereConditions.push(`va.status = $${paramCount}`);
      queryParams.push(status);
      paramCount++;
    }

    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}` 
      : '';

    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(DISTINCT va.id) as total
      FROM volunteer_applications va
      ${departmentNameId || departmentId ? 'INNER JOIN volunteer_application_departments vad ON va.id = vad.volunteer_application_id' : ''}
      ${departmentNameId || departmentId ? 'INNER JOIN department_names dn ON vad.department_name_id = dn.id' : ''}
      ${whereClause}
    `;

    const countResult = await pool.query(countQuery, queryParams);
    const totalItems = parseInt(countResult.rows[0].total, 10);
    const totalPages = Math.ceil(totalItems / limitNum);

    // Build sort clause
    const sortClause = sortColumn === 'memberName' 
      ? `m.full_name ${order}` 
      : `va.created_at ${order}`;

    // Get paginated results
    const dataQuery = `
      SELECT DISTINCT ON (va.id)
        va.id,
        va.member_id,
        va.status,
        va.created_at,
        va.updated_at,
        m.full_name as member_name,
        m.email as member_email,
        m.phone as member_phone
      FROM volunteer_applications va
      INNER JOIN members m ON va.member_id = m.id
      ${departmentNameId || departmentId ? 'INNER JOIN volunteer_application_departments vad ON va.id = vad.volunteer_application_id' : ''}
      ${departmentNameId || departmentId ? 'INNER JOIN department_names dn ON vad.department_name_id = dn.id' : ''}
      ${whereClause}
      ORDER BY va.id, ${sortClause}
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;

    queryParams.push(limitNum, offset);
    const dataResult = await pool.query(dataQuery, queryParams);

    // Fetch departments for each request
    const requestsWithDepartments = await Promise.all(
      dataResult.rows.map(async (request) => {
        const deptResult = await pool.query(`
          SELECT 
            dn.id,
            dn.department_name,
            vd.department as department_heading,
            vd.id as department_heading_id
          FROM volunteer_application_departments vad
          INNER JOIN department_names dn ON vad.department_name_id = dn.id
          INNER JOIN volunteer_departments vd ON dn.department_id = vd.id
          WHERE vad.volunteer_application_id = $1
          ORDER BY vd.department, dn.department_name
        `, [request.id]);

        return {
          id: request.id,
          member: {
            id: request.member_id,
            name: request.member_name,
            email: request.member_email,
            phone: request.member_phone
          },
          status: request.status,
          createdAt: request.created_at,
          updatedAt: request.updated_at,
          departments: deptResult.rows.map(d => ({
            id: d.id,
            departmentName: d.department_name,
            departmentHeading: d.department_heading,
            departmentHeadingId: d.department_heading_id
          }))
        };
      })
    );

    // Build filters object for response
    const filters = {};
    if (departmentNameId) filters.departmentNameId = departmentNameId;
    if (departmentId) filters.departmentId = departmentId;
    if (status) filters.status = status;

    res.json({
      success: true,
      data: {
        requests: requestsWithDepartments,
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalItems,
          itemsPerPage: limitNum,
          hasNextPage: pageNum < totalPages,
          hasPrevPage: pageNum > 1
        },
        filters
      }
    });

  } catch (error) {
    console.log(error);
    
    console.error('Error listing volunteer requests:', error);
    res.status(500).json({
      success: false,
      message: 'An unexpected error occurred. Please try again later.',
      code: 'INTERNAL_SERVER_ERROR'
    });
  }
};

/**
 * Get single volunteer request details
 * Admin endpoint - auth required
 */
exports.getVolunteerRequestById = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request ID format',
        code: 'VALIDATION_ERROR'
      });
    }

    const result = await pool.query(`
      SELECT 
        va.id,
        va.member_id,
        va.status,
        va.created_at,
        va.updated_at,
        m.full_name as member_name,
        m.email as member_email,
        m.phone as member_phone,
        m.address as member_address,
        m.created_at as member_since
      FROM volunteer_applications va
      INNER JOIN members m ON va.member_id = m.id
      WHERE va.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Volunteer request not found',
        code: 'NOT_FOUND'
      });
    }

    const request = result.rows[0];

    // Fetch departments
    const deptResult = await pool.query(`
      SELECT 
        dn.id,
        dn.department_name,
        dn.department_description,
        vd.department as department_heading,
        vd.id as department_heading_id
      FROM volunteer_application_departments vad
      INNER JOIN department_names dn ON vad.department_name_id = dn.id
      INNER JOIN volunteer_departments vd ON dn.department_id = vd.id
      WHERE vad.volunteer_application_id = $1
      ORDER BY vd.department, dn.department_name
    `, [id]);

    res.json({
      success: true,
      data: {
        id: request.id,
        member: {
          id: request.member_id,
          name: request.member_name,
          email: request.member_email,
          phone: request.member_phone,
          address: request.member_address,
          memberSince: request.member_since
        },
        status: request.status,
        createdAt: request.created_at,
        updatedAt: request.updated_at,
        completedAt: request.status === 'completed' ? request.updated_at : null,
        departments: deptResult.rows.map(d => ({
          id: d.id,
          departmentName: d.department_name,
          departmentHeading: d.department_heading,
          departmentHeadingId: d.department_heading_id,
          description: d.department_description
        }))
      }
    });

  } catch (error) {
    console.error('Error fetching volunteer request:', error);
    res.status(500).json({
      success: false,
      message: 'An unexpected error occurred. Please try again later.',
      code: 'INTERNAL_SERVER_ERROR'
    });
  }
};

/**
 * Update volunteer request status
 * Admin endpoint - auth required
 */
exports.updateVolunteerRequestStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request ID format',
        code: 'VALIDATION_ERROR'
      });
    }

    // Validate status
    if (status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Only "completed" is allowed.',
        errors: ['Status must be "completed"'],
        code: 'VALIDATION_ERROR'
      });
    }

    // Validate notes length if provided
    if (notes && notes.length > 1000) {
      return res.status(400).json({
        success: false,
        message: 'Notes are too long. Maximum 1000 characters allowed.',
        errors: ['Notes must be 1000 characters or less'],
        code: 'VALIDATION_ERROR'
      });
    }

    // Check if request exists and get current status
    const checkResult = await pool.query(`
      SELECT id, status, member_id
      FROM volunteer_applications
      WHERE id = $1
    `, [id]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Volunteer request not found',
        code: 'NOT_FOUND'
      });
    }

    const currentStatus = checkResult.rows[0].status;
    const memberId = checkResult.rows[0].member_id;

    // Check if already completed
    if (currentStatus === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Cannot update status. Request is already completed.',
        code: 'INVALID_TRANSITION'
      });
    }

    // Update status
    const updateResult = await pool.query(`
      UPDATE volunteer_applications
      SET status = 'completed', updated_at = NOW()
      WHERE id = $1 AND status = 'pending'
      RETURNING id, status, created_at, updated_at
    `, [id]);

    if (updateResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Failed to update status. Request may have been modified.',
        code: 'UPDATE_FAILED'
      });
    }

    // Fetch member and department details
    const detailsResult = await pool.query(`
      SELECT 
        m.full_name as member_name,
        m.email as member_email,
        json_agg(
          json_build_object(
            'departmentName', dn.department_name,
            'departmentHeading', vd.department
          )
        ) as departments
      FROM members m
      CROSS JOIN volunteer_applications va
      LEFT JOIN volunteer_application_departments vad ON va.id = vad.volunteer_application_id
      LEFT JOIN department_names dn ON vad.department_name_id = dn.id
      LEFT JOIN volunteer_departments vd ON dn.department_id = vd.id
      WHERE m.id = $1 AND va.id = $2
      GROUP BY m.id
    `, [memberId, id]);

    const updatedRequest = updateResult.rows[0];
    const details = detailsResult.rows[0];

    res.json({
      success: true,
      message: 'Volunteer request status updated successfully',
      data: {
        id: updatedRequest.id,
        member: {
          id: memberId,
          name: details.member_name,
          email: details.member_email
        },
        status: updatedRequest.status,
        createdAt: updatedRequest.created_at,
        completedAt: updatedRequest.updated_at,
        notes: notes || null,
        departments: details.departments.filter(d => d.departmentName !== null)
      }
    });

  } catch (error) {
    console.error('Error updating volunteer request status:', error);
    res.status(500).json({
      success: false,
      message: 'An unexpected error occurred. Please try again later.',
      code: 'INTERNAL_SERVER_ERROR'
    });
  }
};

