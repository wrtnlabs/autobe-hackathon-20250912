import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsContentCreatorInstructor } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContentCreatorInstructor";
import { ContentcreatorinstructorPayload } from "../decorators/payload/ContentcreatorinstructorPayload";

/**
 * Authenticates an existing Content Creator/Instructor user.
 *
 * Validates email and password. On success, returns user info with JWT tokens.
 * Uses MyGlobal.password utilities for password verification.
 *
 * @param props - Contains authenticated payload and login request body
 * @returns Authenticated user info and authorization tokens
 * @throws {Error} If credentials are invalid or user not active
 */
export async function postauthContentCreatorInstructorLogin(props: {
  contentCreatorInstructor: ContentcreatorinstructorPayload;
  body: IEnterpriseLmsContentCreatorInstructor.ILogin;
}): Promise<IEnterpriseLmsContentCreatorInstructor.IAuthorized> {
  const { body } = props;

  const user =
    await MyGlobal.prisma.enterprise_lms_contentcreatorinstructor.findFirst({
      where: {
        email: body.email,
        status: "active",
        deleted_at: null,
      },
    });

  if (user === null) {
    throw new Error("Invalid credentials");
  }

  const valid = await MyGlobal.password.verify(
    body.password,
    user.password_hash,
  );
  if (!valid) {
    throw new Error("Invalid credentials");
  }

  const nowEpoch = Date.now();
  const accessExpiryMs = 3600 * 1000; // 1 hour
  const refreshExpiryMs = 7 * 24 * 3600 * 1000; // 7 days

  const accessToken = jwt.sign(
    {
      id: user.id,
      tenant_id: user.tenant_id,
      email: user.email,
      type: "contentcreatorinstructor",
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
      token_type: "refresh",
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
      expired_at: toISOStringSafe(new Date(nowEpoch + accessExpiryMs)),
      refreshable_until: toISOStringSafe(new Date(nowEpoch + refreshExpiryMs)),
    },
  };
}
