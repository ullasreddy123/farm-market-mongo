const axios = require("axios");

const BASE_URL = process.env.TWO_FACTOR_BASE_URL || "https://2factor.in/API/V1";
const API_KEY = process.env.TWO_FACTOR_API_KEY;

/**
 * Sends an OTP to an Indian phone number using 2Factor's Auto-Generated OTP API.
 * Docs: https://2factor.in/API/V1/{api_key}/SMS/{phone}/AUTOGEN
 * Returns the sessionId which must be stored and passed back on verification.
 */
const sendOtp = async (phone) => {
  if (!API_KEY || API_KEY === "your_actual_key_here") {
    throw new Error(
      "2Factor API key not configured. Add TWO_FACTOR_API_KEY to your .env file."
    );
  }

  const url = `${BASE_URL}/${API_KEY}/SMS/${phone}/AUTOGEN`;
  console.log(
    "[DEBUG] Calling 2Factor URL:",
    url.replace(API_KEY, API_KEY.slice(0, 4) + "..." + API_KEY.slice(-4))
  );
  const { data } = await axios.get(url);

  if (data.Status !== "Success") {
    throw new Error(data.Details || "Failed to send OTP");
  }

  return data.Details; // this is the sessionId
};

/**
 * Verifies an OTP against a session using 2Factor's verification API.
 * Docs: https://2factor.in/API/V1/{api_key}/SMS/VERIFY/{sessionId}/{otp}
 */
const verifyOtp = async (sessionId, otp) => {
  if (!API_KEY || API_KEY === "your_actual_key_here") {
    throw new Error(
      "2Factor API key not configured. Add TWO_FACTOR_API_KEY to your .env file."
    );
  }

  const url = `${BASE_URL}/${API_KEY}/SMS/VERIFY/${sessionId}/${otp}`;
  const { data } = await axios.get(url);

  return data.Status === "Success";
};

module.exports = { sendOtp, verifyOtp };
