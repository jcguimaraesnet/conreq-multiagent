import pino from "pino";

const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  base: { service: "frontend" },
  timestamp: pino.stdTimeFunctions.isoTime,
  transport: {
    target: "pino-pretty",
    options: {
      colorize: false,
      translateTime: false,
      ignore: "pid,hostname,time,level,service",
      hideObject: true,
      messageFormat: "{msg}",
      singleLine: true,
    },
  },
});

export default logger;
