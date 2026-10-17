import jwt, { JwtPayload } from "jsonwebtoken";
import { env } from "../../config/env";


export function signAccessToken(userId: string, sessionId: string): string {
    // Create the payload for the JWT use the userId and sessionId
    const payload : JwtPayload = {
        sub: userId,
        sid: sessionId,
    };
    // Define the options for the JWT, including the expiration time and algorithm
    const options: jwt.SignOptions = {
        expiresIn: env.jwt.expiresIn as jwt.SignOptions["expiresIn"],
        algorithm: "HS256",
    };

    return jwt.sign(payload, env.jwt.secret, options);
}

export function verifyAccessToken(token: string): JwtPayload {
    try {
        const decoded = jwt.verify(token, env.jwt.secret,{algorithms: ["HS256"]} ) as JwtPayload;
        return decoded;
    } catch (error) {
        throw new Error("Invalid or expired access token");
    }
}
