import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IOauthServerSocialProvider } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerSocialProvider";
import { DeveloperPayload } from "../decorators/payload/DeveloperPayload";

/**
 * Update a social login provider configuration
 *
 * This operation updates the oauth_server_social_providers table's existing
 * record with new details provided in the body. It ensures uniqueness of
 * provider_name and updates timestamps properly.
 *
 * @param props - Object containing developer auth payload, provider id, and
 *   update data
 * @param props.developer - Authenticated developer user payload
 * @param props.id - UUID of the social login provider to update
 * @param props.body - Partial update data for the social login provider
 * @returns Updated social login provider record
 * @throws {Error} If social login provider not found
 * @throws {Error} If provider_name conflicts with existing provider
 */
export async function putoauthServerDeveloperSocialLoginProvidersId(props: {
  developer: DeveloperPayload;
  id: string & tags.Format<"uuid">;
  body: IOauthServerSocialProvider.IUpdate;
}): Promise<IOauthServerSocialProvider> {
  const { developer, id, body } = props;

  const existing =
    await MyGlobal.prisma.oauth_server_social_providers.findFirst({
      where: {
        id,
        deleted_at: null,
      },
    });

  if (!existing) throw new Error("Social login provider not found");

  if (
    body.provider_name !== undefined &&
    body.provider_name !== existing.provider_name
  ) {
    const conflict =
      await MyGlobal.prisma.oauth_server_social_providers.findFirst({
        where: {
          provider_name: body.provider_name,
          deleted_at: null,
        },
      });

    if (conflict)
      throw new Error(
        "A social login provider with the same provider_name already exists",
      );
  }

  const updated = await MyGlobal.prisma.oauth_server_social_providers.update({
    where: { id },
    data: {
      provider_name: body.provider_name ?? undefined,
      client_id: body.client_id ?? undefined,
      client_secret: body.client_secret ?? undefined,
      auth_url: body.auth_url ?? undefined,
      token_url: body.token_url ?? undefined,
      user_info_url: body.user_info_url ?? undefined,
      scopes: body.scopes ?? undefined,
      is_active: body.is_active ?? undefined,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  return {
    id: updated.id as string & tags.Format<"uuid">,
    provider_name: updated.provider_name,
    client_id: updated.client_id,
    client_secret: updated.client_secret,
    auth_url: updated.auth_url,
    token_url: updated.token_url,
    user_info_url: updated.user_info_url,
    scopes: updated.scopes ?? undefined,
    is_active: updated.is_active,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
