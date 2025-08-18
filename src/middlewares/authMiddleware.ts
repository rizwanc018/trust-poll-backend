import type { Request, Response, NextFunction } from "express";
import jwt, { type JwtPayload } from "jsonwebtoken";
import { JWT_SECRET, WORKER_JWT_SECRET } from "../config.js";


declare global {
    namespace Express {
        interface Request {
            userId?: string;
            workerId?: string;
        }
    }
}

interface DecodedToken extends JwtPayload {
    userId?: string;
    workerId?: string;
}

if (!JWT_SECRET) {
    throw new Error("JWT_SECRET is not defined in environment variables");
}

function authenticate(
    req: Request,
    res: Response,
    next: NextFunction,
    secret: string,
    role: "user" | "worker"
) {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader?.startsWith("Bearer ")) {
            return res
                .status(401)
                .json({ message: "Authorization header missing or malformed" });
        }

        const token = authHeader.split(" ")[1];
        if (!token) return res.status(401).json({ message: "Unauthorized" });
        const decoded = jwt.verify(token, secret) as DecodedToken;

        if (role === "user" && !decoded.userId) {
            return res
                .status(401)
                .json({ message: "Invalid user token payload" });
        }

        if (role === "worker" && !decoded.workerId) {
            return res
                .status(401)
                .json({ message: "Invalid worker token payload" });
        }

        if (decoded.userId) req.userId = decoded.userId;
        if (decoded.workerId) req.workerId = decoded.workerId;

        next();
    } catch (error) {
        return res
            .status(401)
            .json({ message: "Unauthorized", error: (error as Error).message });
    }
}

export const userAuthMiddleware = (
    req: Request,
    res: Response,
    next: NextFunction
) => authenticate(req, res, next, JWT_SECRET, "user");

export const workerAuthMiddleware = (
    req: Request,
    res: Response,
    next: NextFunction
) => authenticate(req, res, next, WORKER_JWT_SECRET, "worker");

// import type { Request, Response, NextFunction } from "express";
// import jwt, { type JwtPayload } from "jsonwebtoken";
// import { WORKER_JWT_SECRET } from "../routers/worker.js";

// // Extend Express Request interface to include userId
// declare global {
//     namespace Express {
//         interface Request {
//             userId?: string;
//             workerId?: string;
//         }
//     }
// }

// interface DecodedToken extends JwtPayload {
//     userId?: string;
//     workerId?: string;
// }

// const JWT_SECRET = process.env.JWT_SECRET;
// if (!JWT_SECRET) {
//     throw new Error("JWT_SECRET is not defined in environment variables");
// }

// export const userAuthMiddleware = (
//     req: Request,
//     res: Response,
//     next: NextFunction
// ) => {
//     try {
//         const authHeader = req.headers["authorization"];
//         if (!authHeader)
//             return res
//                 .status(401)
//                 .json({ message: "Authorization header missing" });

//         const token = authHeader.split(" ")[1];
//         if (!token) return res.status(401).json({ message: "Unauthorized" });

//         const decoded = jwt.verify(token, JWT_SECRET) as DecodedToken;
//         if (!decoded.userId)
//             return res.status(401).json({ message: "Invalid token payload" });

//         req.userId = decoded.userId;
//         next();
//     } catch (error) {
//         return res.status(401).json({ message: "Unauthorized" });
//     }
// };

// export const workerAuthMiddleware = (
//     req: Request,
//     res: Response,
//     next: NextFunction
// ) => {
//     try {
//         const authHeader = req.headers["authorization"];
//         if (!authHeader)
//             return res
//                 .status(401)
//                 .json({ message: "Authorization header missing" });

//         const token = authHeader.split(" ")[1];
//         if (!token) return res.status(401).json({ message: "Unauthorized" });

//         const decoded = jwt.verify(token, WORKER_JWT_SECRET) as DecodedToken;
//         if (!decoded.workerId)
//             return res.status(401).json({ message: "Invalid token payload" });

//         req.workerId = decoded.workerId;
//         next();
//     } catch (error) {
//         return res.status(401).json({ message: "Unauthorized" });
//     }
// };
