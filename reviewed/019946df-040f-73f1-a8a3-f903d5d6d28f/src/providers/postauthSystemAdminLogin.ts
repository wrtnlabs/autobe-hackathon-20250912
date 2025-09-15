import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsSystemAdmin";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Authenticate systemAdmin user and provide access tokens.
 *
 * This operation handles login authentication of system administrators by
 * verifying email and password_hash against stored credentials in the database.
 * It returns user details along with signed JWT access and refresh tokens.
 *
 * @param props - Object containing systemAdmin context and login credentials
 * @param props.systemAdmin - The systemAdmin context (not used in this method)
 * @param props.body - Login credentials including email and password_hash
 * @returns Authorized systemAdmin details with JWT tokens
 * @throws {Error} When credentials are invalid or user inactive
 */
export async function postauthSystemAdminLogin(props: {
  systemAdmin: SystemadminPayload;
  body: IEnterpriseLmsSystemAdmin.ILogin;
}): Promise<IEnterpriseLmsSystemAdmin.IAuthorized> {
  const { body } = props;

  const user = await MyGlobal.prisma.enterprise_lms_systemadmin.findFirst({
    where: {
      email: body.email,
      deleted_at: null,
      status: "active",
    },
  });

  if (!user) throw new Error("Invalid credentials");

  const isVerified = await MyGlobal.password.verify(
    body.password_hash,
    user.password_hash,
  );

  if (!isVerified) {
    throw new Error("Invalid credentials");
  }

  const nowTimestamp = Date.now();
  const expiredAtISO = toISOStringSafe(new Date(nowTimestamp + 3600 * 1000));
  const refreshableUntilISO = toISOStringSafe(
    new Date(nowTimestamp + 7 * 24 * 3600 * 1000),
  );

  const accessToken = jwt.sign(
    {
      id: user.id,
      email: user.email,
      type: "systemadmin",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  const refreshToken = jwt.sign(
    {
      id: user.id,
      tokenType: "refresh",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  return {
    id: user.id,
    tenant_id: user.tenant_id,
    email: user.email,
    password_hash: user.password_hash,
    first_name: user.first_name,
    last_name: user.last_name,
    status: user.status,
    created_at: toISOStringSafe(user.created_at),
    updated_at: toISOStringSafe(user.updated_at),
    deleted_at: user.deleted_at ? toISOStringSafe(user.deleted_at) : null,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: expiredAtISO,
      refreshable_until: refreshableUntilISO,
    },
  };
}
