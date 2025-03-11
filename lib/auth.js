import { jwtVerify } from "jose";

export const verifyToken = async (token) => {
  try {
    const jwt = await jwtVerify(
      token,
      new TextEncoder().encode(process.env.JWT_SECRET)
    );

    return jwt;
  } catch (error) {
    return null;
  }
};
