import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementPmo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPmo";
import { PmoPayload } from "../decorators/payload/PmoPayload";

/**
 * Authenticates a Project Management Officer (PMO) user by validating their
 * email and password.
 *
 * This endpoint verifies the provided credentials against the
 * task_management_pmo table. If the credentials are valid, it issues JWT access
 * and refresh tokens.
 *
 * @param props - An object containing the PMO payload and login credentials.
 * @param props.pmo - The PMO authorization payload (not used in this login but
 *   included by system).
 * @param props.body - The login credentials including email and password.
 * @returns The authorized PMO user data with JWT tokens.
 * @throws {Error} If the user is not found or if credentials are invalid.
 */
export async function postauthPmoLogin(props: {
  pmo: PmoPayload;
  body: ITaskManagementPmo.ILogin;
}): Promise<ITaskManagementPmo.IAuthorized> {
  const { body } = props;

  // Find PMO user by email who is not soft deleted
  const pmoUser = await MyGlobal.prisma.task_management_pmo.findFirstOrThrow({
    where: {
      email: body.email,
      deleted_at: null,
    },
  });

  // Verify password using MyGlobal password utilities
  const isPasswordValid = await MyGlobal.password.verify(
    body.password,
    pmoUser.password_hash,
  );
  if (!isPasswordValid) {
    throw new Error("Invalid credentials");
  }

  // Current timestamp as ISO string
  const now = toISOStringSafe(new Date());

  // Compute token expiration timestamps
  const expiredAt = toISOStringSafe(new Date(Date.now() + 60 * 60 * 1000)); // 1 hour later
  const refreshableUntil = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  ); // 7 days later

  // Generate JWT access token
  const accessToken = jwt.sign(
    { id: pmoUser.id, type: "pmo" },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  // Generate JWT refresh token
  const refreshToken = jwt.sign(
    { id: pmoUser.id, type: "pmo", tokenType: "refresh" },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  return {
    id: pmoUser.id,
    email: pmoUser.email,
    name: pmoUser.name,
    created_at: toISOStringSafe(pmoUser.created_at),
    updated_at: toISOStringSafe(pmoUser.updated_at),
    deleted_at: pmoUser.deleted_at ? toISOStringSafe(pmoUser.deleted_at) : null,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: expiredAt,
      refreshable_until: refreshableUntil,
    },
  };
}
