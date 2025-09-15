import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsExternalLearner } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsExternalLearner";
import { ExternallearnerPayload } from "../decorators/payload/ExternallearnerPayload";

/**
 * Registers a new external learner guest user.
 *
 * This operation checks for duplicate tenant_id and email combinations to
 * enforce uniqueness. It then creates a new user record with hashed password
 * and tenant context. After creation, it generates JWT access and refresh
 * tokens scoped for external learner role.
 *
 * @param props - Object containing the externalLearner payload and the join
 *   request body
 * @param props.externalLearner - The authenticated external learner payload
 *   (not utilized in join but required by interface)
 * @param props.body - The join request body containing tenant_id, email,
 *   password_hash, first_name, last_name, and status
 * @returns The authorized external learner user object containing JWT tokens
 *   and timestamps
 * @throws {Error} If email already exists for the given tenant
 */
export async function postauthExternalLearnerJoin(props: {
  externalLearner: ExternallearnerPayload;
  body: IEnterpriseLmsExternalLearner.IJoin;
}): Promise<IEnterpriseLmsExternalLearner.IAuthorized> {
  const { externalLearner, body } = props;

  // Check for duplicate email within the same tenant that is not deleted
  const existing =
    await MyGlobal.prisma.enterprise_lms_externallearner.findFirst({
      where: {
        tenant_id: body.tenant_id,
        email: body.email,
        deleted_at: null,
      },
    });

  if (existing) {
    throw new Error("Email already registered for this tenant");
  }

  // Generate timestamps as ISO strings
  const now = toISOStringSafe(new Date());

  // Create the new external learner user
  const created = await MyGlobal.prisma.enterprise_lms_externallearner.create({
    data: {
      id: v4(),
      tenant_id: body.tenant_id,
      email: body.email,
      password_hash: body.password_hash,
      first_name: body.first_name,
      last_name: body.last_name,
      status: body.status,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  // Define token expiration durations in seconds
  const accessTokenValiditySeconds = 3600; // 1 hour
  const refreshTokenValiditySeconds = 7 * 24 * 3600; // 7 days

  // Calculate ISO string expiry times
  const accessExpiresAt = new Date(
    Date.now() + accessTokenValiditySeconds * 1000,
  ).toISOString() as string & tags.Format<"date-time">;
  const refreshExpiresAt = new Date(
    Date.now() + refreshTokenValiditySeconds * 1000,
  ).toISOString() as string & tags.Format<"date-time">;

  // Create JWT access token
  const access_token = jwt.sign(
    {
      id: created.id,
      email: created.email,
      tenant_id: created.tenant_id,
      type: "externallearner",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  // Create JWT refresh token
  const refresh_token = jwt.sign(
    {
      id: created.id,
      tokenType: "refresh",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  // Construct the token object conforming to IAuthorizationToken
  const token: IEnterpriseLmsExternalLearner.IAuthorized["token"] = {
    access: access_token,
    refresh: refresh_token,
    expired_at: accessExpiresAt,
    refreshable_until: refreshExpiresAt,
  };

  return {
    id: created.id,
    tenant_id: created.tenant_id,
    email: created.email,
    password_hash: created.password_hash,
    first_name: created.first_name,
    last_name: created.last_name,
    status: created.status,
    created_at: now,
    updated_at: now,
    deleted_at: null,
    access_token,
    refresh_token,
    token,
  };
}
