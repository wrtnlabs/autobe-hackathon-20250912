import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsCorporateLearner } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsCorporateLearner";
import { CorporatelearnerPayload } from "../decorators/payload/CorporatelearnerPayload";

/**
 * Refresh JWT access token for corporate learner using a valid refresh token.
 *
 * This operation verifies the provided refresh token, fetches the corporate
 * learner associated with the token, and issues new JWT access and refresh
 * tokens with the same payload structure as login. It maintains session
 * continuity without requiring the user to re-authenticate credentials.
 *
 * @param props - The properties containing the corporate learner payload and
 *   request body.
 * @param props.corporateLearner - The authenticated corporate learner payload
 *   (not used directly in the function but required for authorization
 *   context).
 * @param props.body - The request body containing the refresh token.
 * @returns The authorized corporate learner information with renewed JWT
 *   tokens.
 * @throws {Error} Throws if the refresh token is invalid, expired, or the user
 *   is not found or inactive.
 */
export async function postauthCorporateLearnerRefresh(props: {
  corporateLearner: CorporatelearnerPayload;
  body: IEnterpriseLmsCorporateLearner.IRequestRefresh;
}): Promise<IEnterpriseLmsCorporateLearner.IAuthorized> {
  const { body } = props;

  let decoded: { id: string & tags.Format<"uuid"> };
  try {
    decoded = jwt.verify(body.refresh_token, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    }) as { id: string & tags.Format<"uuid"> };
  } catch {
    throw new Error("Invalid or expired refresh token");
  }

  const user = await MyGlobal.prisma.enterprise_lms_corporatelearner.findFirst({
    where: {
      id: decoded.id,
      deleted_at: null,
      status: "active",
    },
  });

  if (!user) {
    throw new Error("User not found or inactive");
  }

  const now = toISOStringSafe(new Date());

  const accessPayload = {
    id: user.id,
    tenant_id: user.tenant_id,
    email: user.email,
    first_name: user.first_name,
    last_name: user.last_name,
    status: user.status,
    created_at: toISOStringSafe(user.created_at),
    updated_at: toISOStringSafe(user.updated_at),
  };

  // Generate access token valid for 1 hour
  const accessToken = jwt.sign(accessPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "1h",
    issuer: "autobe",
  });

  // Generate refresh token valid for 7 days
  const refreshToken = jwt.sign(
    { id: user.id, tokenType: "refresh" },
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
      expired_at: toISOStringSafe(new Date(Date.now() + 3600 * 1000)),
      refreshable_until: toISOStringSafe(
        new Date(Date.now() + 7 * 24 * 3600 * 1000),
      ),
    },
  };
}
