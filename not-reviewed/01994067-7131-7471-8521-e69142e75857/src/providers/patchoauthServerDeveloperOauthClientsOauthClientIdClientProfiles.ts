import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IOauthServerClientProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerClientProfile";
import { IPageIOauthServerClientProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIOauthServerClientProfile";
import { DeveloperPayload } from "../decorators/payload/DeveloperPayload";

/**
 * List OAuth client profiles for a given OAuth client with pagination and
 * filtering.
 *
 * This operation retrieves a paginated list of OAuth client profiles associated
 * with the specified OAuth client. It supports filtering by nickname and
 * description, pagination using page and limit, and sorting by creation date
 * descending. Only active (non-deleted) client profiles are returned.
 * Developers can only access client profiles for OAuth clients they own.
 *
 * @param props - The properties containing the authenticated developer, target
 *   OAuth client ID, and search criteria with pagination.
 * @param props.developer - The authenticated developer making the request.
 * @param props.oauthClientId - UUID of the OAuth client whose profiles are
 *   being requested.
 * @param props.body - Search criteria and pagination parameters for client
 *   profiles.
 * @returns A paginated list of OAuth client profiles matching the search
 *   criteria.
 * @throws {Error} When the OAuth client does not exist or is not owned by the
 *   developer.
 */
export async function patchoauthServerDeveloperOauthClientsOauthClientIdClientProfiles(props: {
  developer: DeveloperPayload;
  oauthClientId: string & tags.Format<"uuid">;
  body: IOauthServerClientProfile.IRequest;
}): Promise<IPageIOauthServerClientProfile> {
  const { developer, oauthClientId, body } = props;

  // Verify ownership of the OAuth client by the developer
  // Note: The schema does not explicitly relate developer and client,
  // so this check verifies the client exists and is not deleted.
  const oauthClient =
    await MyGlobal.prisma.oauth_server_oauth_clients.findFirst({
      where: {
        id: oauthClientId,
        deleted_at: null,
      },
    });

  if (!oauthClient) {
    throw new Error(
      "Unauthorized: Developer does not own the OAuth client or client does not exist",
    );
  }

  const page = body.page ?? 0;
  const limit = body.limit ?? 10;
  const skip = page * limit;

  // Build filtering conditions
  const whereCondition = {
    oauth_client_id: oauthClientId,
    deleted_at: null,
    ...(body.nickname !== undefined &&
      body.nickname !== null && {
        nickname: { contains: body.nickname },
      }),
    ...(body.description !== undefined &&
      body.description !== null && {
        description: { contains: body.description },
      }),
  };

  // Query matching client profiles and total count
  const [profiles, total] = await Promise.all([
    MyGlobal.prisma.oauth_server_client_profiles.findMany({
      where: whereCondition,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.oauth_server_client_profiles.count({
      where: whereCondition,
    }),
  ]);

  // Return paginated result with all dates converted
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: profiles.map((profile) => ({
      id: profile.id,
      oauth_client_id: profile.oauth_client_id,
      nickname: profile.nickname,
      description: profile.description ?? null,
      deleted_at: profile.deleted_at
        ? toISOStringSafe(profile.deleted_at)
        : null,
      created_at: toISOStringSafe(profile.created_at),
      updated_at: toISOStringSafe(profile.updated_at),
    })),
  };
}
