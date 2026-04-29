import { Request, Response, NextFunction } from 'express';

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  console.error('[API Error]', err.message);

  if (err.name === 'PrismaClientKnownRequestError') {
    res.status(409).json({ success: false, error: 'Database conflict – record may already exist' });
    return;
  }

  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
}
