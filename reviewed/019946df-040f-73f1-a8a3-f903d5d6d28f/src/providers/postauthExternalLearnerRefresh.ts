import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsExternalLearner } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsExternalLearner";
import { ExternallearnerPayload } from "../decorators/payload/ExternallearnerPayload";

export async function postauthExternalLearnerRefresh(props: {
  externalLearner: ExternallearnerPayload;
  body: IEnterpriseLmsExternalLearner.IRefresh;
}): Promise<IEnterpriseLmsExternalLearner.IAuthorized> {
  const { body } = props;

  let decoded: { id: string & tags.Format<"uuid">; type: string };
  try {
    decoded = jwt.verify(body.refresh_token, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    }) as { id: string & tags.Format<"uuid">; type: string };
  } catch {
    throw new Error("Invalid or expired refresh token");
  }

  if (decoded.type !== "externallearner") {
    throw new Error("Invalid token type");
  }

  const user = await MyGlobal.prisma.enterprise_lms_externallearner.findFirst({
    where: {
      id: decoded.id,
      status: "active",
      deleted_at: null,
    },
  });

  if (!user) {
    throw new Error("User not found or inactive");
  }

  const accessTokenPayload = {
    id: user.id,
    type: "externallearner",
  };

  const accessToken = jwt.sign(
    accessTokenPayload,
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  const refreshTokenPayload = {
    id: user.id,
    type: "externallearner",
  };

  const refreshToken = jwt.sign(
    refreshTokenPayload,
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  return {
    id: user.id,
    tenant_id: user.tenant_id,
    email: user.email as string & tags.Format<"email">,
    password_hash: user.password_hash,
    first_name: user.first_name,
    last_name: user.last_name,
    status: user.status,
    created_at: toISOStringSafe(user.created_at),
    updated_at: toISOStringSafe(user.updated_at),
    deleted_at: user.deleted_at ? toISOStringSafe(user.deleted_at) : null,
    access_token: accessToken,
    refresh_token: refreshToken,
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
