import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementQa } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementQa";
import { QaPayload } from "../decorators/payload/QaPayload";

/**
 * QA user login to issue access tokens.
 *
 * Authenticates an existing QA user by verifying the provided email and
 * password against stored hashed credentials in the database. Upon successful
 * validation, issues JWT access and refresh tokens for secure access.
 *
 * This endpoint is publicly accessible and does not require prior
 * authentication.
 *
 * @param props - Object containing authenticated QA payload and login body.
 * @param props.qa - The QA user's authenticated payload (not used directly in
 *   login).
 * @param props.body - The login request body containing email and password.
 * @returns Authorized QA user information including JWT tokens.
 * @throws {Error} If authentication fails due to invalid email or password.
 */
export async function postauthQaLogin(props: {
  qa: QaPayload;
  body: ITaskManagementQa.ILogin;
}): Promise<ITaskManagementQa.IAuthorized> {
  const { body } = props;

  // Fetch QA user by email (exclude soft-deleted users)
  const qaUser = await MyGlobal.prisma.task_management_qa.findFirst({
    where: {
      email: body.email,
      deleted_at: null,
    },
  });

  if (!qaUser) {
    throw new Error("Invalid email or password");
  }

  // Verify password
  const passwordValid = await MyGlobal.password.verify(
    body.password,
    qaUser.password_hash,
  );

  if (!passwordValid) {
    throw new Error("Invalid email or password");
  }

  // Calculate token expirations
  const now = toISOStringSafe(new Date());
  const expiredAt = toISOStringSafe(new Date(Date.now() + 60 * 60 * 1000)); // 1 hour
  const refreshableUntil = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  ); // 7 days

  // Generate JWT access token
  const accessToken = jwt.sign(
    { id: qaUser.id, type: "qa" },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );

  // Generate JWT refresh token
  const refreshToken = jwt.sign(
    { id: qaUser.id, type: "qa", tokenType: "refresh" },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );

  return {
    id: qaUser.id,
    email: qaUser.email,
    password_hash: qaUser.password_hash,
    name: qaUser.name,
    created_at: toISOStringSafe(qaUser.created_at),
    updated_at: toISOStringSafe(qaUser.updated_at),
    deleted_at: qaUser.deleted_at ? toISOStringSafe(qaUser.deleted_at) : null,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: expiredAt,
      refreshable_until: refreshableUntil,
    },
  };
}
