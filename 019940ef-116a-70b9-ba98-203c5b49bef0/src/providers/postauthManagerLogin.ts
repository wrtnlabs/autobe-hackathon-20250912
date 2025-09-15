import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IJobPerformanceEvalManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalManager";
import { ManagerPayload } from "../decorators/payload/ManagerPayload";

/**
 * Authenticate manager with email and password and issue JWT tokens.
 *
 * This operation validates credentials against the
 * job_performance_eval_managers table. It generates JWT access and refresh
 * tokens upon successful validation.
 *
 * @param props - Object containing manager payload and login credentials
 * @param props.manager - (Unused) Authenticated manager payload, included for
 *   signature consistency
 * @param props.body - Manager login credentials: email and password
 * @returns Authorized manager data including tokens
 * @throws {Error} When the email does not exist or credentials are invalid
 */
export async function postauthManagerLogin(props: {
  manager: ManagerPayload;
  body: IJobPerformanceEvalManager.ILogin;
}): Promise<IJobPerformanceEvalManager.IAuthorized> {
  const { body } = props;

  // Find manager by email and active status
  const manager = await MyGlobal.prisma.job_performance_eval_managers.findFirst(
    {
      where: {
        email: body.email,
        deleted_at: null,
      },
    },
  );

  if (!manager) {
    throw new Error("Invalid email or password");
  }

  // Verify password
  const passwordValid = await MyGlobal.password.verify(
    body.password,
    manager.password_hash,
  );
  if (!passwordValid) {
    throw new Error("Invalid email or password");
  }

  // Calculate token expirations
  const now = new Date();
  const accessExpiresInSeconds = 60 * 60; // 1 hour
  const refreshExpiresInSeconds = 7 * 24 * 60 * 60; // 7 days

  const accessExpiredAt = toISOStringSafe(
    new Date(Date.now() + accessExpiresInSeconds * 1000),
  );
  const refreshableUntil = toISOStringSafe(
    new Date(Date.now() + refreshExpiresInSeconds * 1000),
  );

  // Generate JWT Access Token
  const accessToken = jwt.sign(
    {
      id: manager.id,
      email: manager.email,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: accessExpiresInSeconds,
      issuer: "autobe",
    },
  );

  // Generate JWT Refresh Token
  const refreshToken = jwt.sign(
    {
      id: manager.id,
      tokenType: "refresh",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: refreshExpiresInSeconds,
      issuer: "autobe",
    },
  );

  return {
    id: manager.id,
    email: manager.email,
    password_hash: manager.password_hash,
    name: manager.name,
    created_at: toISOStringSafe(manager.created_at),
    updated_at: toISOStringSafe(manager.updated_at),
    deleted_at: manager.deleted_at
      ? toISOStringSafe(manager.deleted_at)
      : undefined,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpiredAt,
      refreshable_until: refreshableUntil,
    },
  };
}
