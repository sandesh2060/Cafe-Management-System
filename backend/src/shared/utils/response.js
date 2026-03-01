// file: backend/src/shared/utils/response.js

export const sendSuccess = (
  res,
  data = {},
  message = "Success",
  statusCode = 200,
) => {
  res.status(statusCode).json({ success: true, message, data });
};
export const sendError = (res, message = "Error", statusCode = 400) => {
  res.status(statusCode).json({ success: false, message });
};
