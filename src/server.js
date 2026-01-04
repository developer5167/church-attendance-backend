require('dotenv').config();
const app = require('./app');


const PORT = process.env.PORT || 4000;

app.get("/", (req, res) => {
  res.send("Church Management API is running.");
});
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
