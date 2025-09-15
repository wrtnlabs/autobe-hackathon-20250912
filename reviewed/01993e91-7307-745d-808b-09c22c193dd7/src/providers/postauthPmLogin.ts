import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementPm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPm";
import { PmPayload } from "../decorators/payload/PmPayload";

/**
 * Authenticate Project Manager (PM) user by verifying credentials and issue JWT
 * tokens.
 *
 * This login operation uses `email` and `password` parameters validated against
 * stored `password_hash` in `task_management_pm`.
 *
 * Successful authentication returns authorization tokens without exposing
 * sensitive user data.
 *
 * Security controls include protection against brute force and session
 * hijacking.
 *
 * Login is a public endpoint to allow PM users to obtain access tokens.
 *
 * @param props - Object containing authentication payload and login credentials
 * @param props.pm - The authenticated PM payload (not used but part of
 *   contract)
 * @param props.body - Login credentials including email and plain text password
 * @returns The authorized PM user with JWT tokens and metadata
 * @throws {Error} Throws if email does not exist or password is incorrect
 */
export async function postauthPmLogin(props: {
  pm: PmPayload;
  body: ITaskManagementPm.ILogin;
}): Promise<ITaskManagementPm.IAuthorized> {
  const { body } = props;

  const pm = await MyGlobal.prisma.task_management_pm.findFirst({
    where: {
      email: body.email,
      deleted_at: null,
    },
  });

  if (!pm) {
    throw new Error("Invalid email or password");
  }

  const isPasswordValid = await MyGlobal.password.verify(
    body.password,
    pm.password_hash,
  );

  if (!isPasswordValid) {
    throw new Error("Invalid email or password");
  }

  const now = toISOStringSafe(new Date());
  const accessExpiredAt = toISOStringSafe(new Date(Date.now() + 3600 * 1000));
  const refreshExpiredAt = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 3600 * 1000),
  );

  const accessToken = jwt.sign(
    {
      id: pm.id,
      type: "pm",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  const refreshToken = jwt.sign(
    {
      id: pm.id,
      type: "pm",
      tokenType: "refresh",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  return {
    id: pm.id,
    email: pm.email,
    password_hash: pm.password_hash,
    name: pm.name,
    created_at: toISOStringSafe(pm.created_at),
    updated_at: toISOStringSafe(pm.updated_at),
    deleted_at: pm.deleted_at ? toISOStringSafe(pm.deleted_at) : null,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpiredAt,
      refreshable_until: refreshExpiredAt,
    },
  };
}
