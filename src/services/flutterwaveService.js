import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const FLUTTERWAVE_SECRET_KEY = process.env.FLUTTERWAVE_SECRET_KEY;
const FLW_BASE_URL = 'https://api.flutterwave.com/v3';

export const initiateMobileMoneyPayment = async ({ amount, phone, email, fullName, tx_ref }) => {
  const response = await axios.post(`${FLW_BASE_URL}/charges?type=mobile_money_uganda`, {
    tx_ref,
    amount,
    currency: 'UGX',
    email,
    phone_number: phone,
    fullname: fullName,
    redirect_url: 'https://afrodoctor.com/payment-success',
    narration: 'Appointment Payment'
  }, {
    headers: {
      Authorization: `Bearer ${FLUTTERWAVE_SECRET_KEY}`
    }
  });

  return response.data;
};

export const verifyTransaction = async (tx_id) => {
  const response = await axios.get(`${FLW_BASE_URL}/transactions/${tx_id}/verify`, {
    headers: {
      Authorization: `Bearer ${FLUTTERWAVE_SECRET_KEY}`
    }
  });

  return response.data;
};
