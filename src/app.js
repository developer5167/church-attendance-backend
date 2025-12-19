const express = require('express');
const cors = require('cors');

const adminRoutes = require('./routes/admin.routes');
const memberRoutes = require('./routes/member.routes');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/admin', adminRoutes);
app.use('/api/member', memberRoutes);

module.exports = app;
