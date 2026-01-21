require('dotenv').config();
const app = require('./app');


const PORT = process.env.PORT || 4000;

app.get("/", (req, res) => {
  res.send({"status":"ok" , "message":"Church Attendance API is running", "version":"1.0.0"});
});
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
