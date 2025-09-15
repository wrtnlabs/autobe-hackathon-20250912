import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsContentCreatorInstructor } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContentCreatorInstructor";
import { ContentcreatorinstructorPayload } from "../decorators/payload/ContentcreatorinstructorPayload";

/**
 * Registers a new Content Creator/Instructor account for the tenant
 * organization.
 *
 * This function checks for duplicate email within the tenant, hashes the
 * password as already provided, creates a new user record with a UUID, and
 * issues JWT tokens for immediate authenticated sessions.
 *
 * @param props - Object containing the authenticated contentCreatorInstructor
 *   payload and creation body
 * @param props.contentCreatorInstructor - The authenticated
 *   contentCreatorInstructor making the request (not used here but required due
 *   to role binding)
 * @param props.body - The creation payload including tenant_id, email,
 *   password_hash, first_name, last_name, and status
 * @returns The newly created content creator with authorization tokens included
 * @throws {Error} When email is already registered for the tenant
 */
export async function postauthContentCreatorInstructorJoin(props: {
  contentCreatorInstructor: ContentcreatorinstructorPayload;
  body: IEnterpriseLmsContentCreatorInstructor.ICreate;
}): Promise<IEnterpriseLmsContentCreatorInstructor.IAuthorized> {
  const { contentCreatorInstructor, body } = props;

  // Check for duplicate email
  const duplicate =
    await MyGlobal.prisma.enterprise_lms_contentcreatorinstructor.findFirst({
      where: {
        tenant_id: body.tenant_id,
        email: body.email,
      },
    });

  if (duplicate) {
    throw new Error("Email already registered for this tenant");
  }

  // Generate new UUID for user
  const id = v4() as string & tags.Format<"uuid">;

  // Current timestamp string
  const now = toISOStringSafe(new Date());

  // Create new content creator instructor
  const created =
    await MyGlobal.prisma.enterprise_lms_contentcreatorinstructor.create({
      data: {
        id,
        tenant_id: body.tenant_id,
        email: body.email,
        password_hash: body.password_hash,
        first_name: body.first_name,
        last_name: body.last_name,
        status: body.status,
        created_at: now,
        updated_at: now,
      },
    });

  // Generate JWT tokens
  const accessToken = jwt.sign(
    {
      userId: created.id,
      email: created.email,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  const refreshToken = jwt.sign(
    {
      userId: created.id,
      tokenType: "refresh",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  // Calculate expiration timestamps for tokens
  const expiredAt = toISOStringSafe(new Date(Date.now() + 1 * 60 * 60 * 1000));
  const refreshableUntil = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );

  return {
    id: created.id,
    tenant_id: created.tenant_id,
    email: created.email,
    password_hash: created.password_hash,
    first_name: created.first_name,
    last_name: created.last_name,
    status: created.status,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: expiredAt,
      refreshable_until: refreshableUntil,
    },
  };
}
