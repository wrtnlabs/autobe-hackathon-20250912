import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IOauthServerSocialUserLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerSocialUserLink";
import { IPageIOauthServerSocialUserLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIOauthServerSocialUserLink";
import { DeveloperPayload } from "../decorators/payload/DeveloperPayload";

/**
 * Search social user links for a specific social login provider with filtering,
 * sorting, and pagination.
 *
 * This function retrieves a paginated list of social user link summaries
 * associated with the given social login provider. It supports searching by
 * various filters such as user ID, external user ID, creation and update date
 * ranges, and soft deletion status.
 *
 * @param props - Object containing the authenticated developer, the social
 *   login provider ID, and filter criteria.
 * @param props.developer - The authenticated developer making the request
 * @param props.socialLoginProviderId - UUID of the social login provider to
 *   filter by
 * @param props.body - Filter and pagination parameters conforming to
 *   IOauthServerSocialUserLink.IRequest
 * @returns A paginated summary list of social user links matching the criteria
 * @throws {Error} Throws if the query fails or parameters are invalid
 */
export async function patchoauthServerDeveloperSocialLoginProvidersSocialLoginProviderIdSocialUserLinks(props: {
  developer: DeveloperPayload;
  socialLoginProviderId: string & tags.Format<"uuid">;
  body: IOauthServerSocialUserLink.IRequest;
}): Promise<IPageIOauthServerSocialUserLink.ISummary> {
  const { developer, socialLoginProviderId, body } = props;

  const limit = (body.limit ?? 10) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const offset = (body.offset ?? 0) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const currentPage = Math.floor(offset / limit) + 1;

  const whereClause: any = {
    social_provider_id: socialLoginProviderId,
  };

  if (body.user_id !== undefined && body.user_id !== null) {
    whereClause.user_id = body.user_id;
  }

  if (body.external_user_id !== undefined && body.external_user_id !== null) {
    whereClause.external_user_id = {
      contains: body.external_user_id,
    };
  }

  if (
    (body.created_at_gte !== undefined && body.created_at_gte !== null) ||
    (body.created_at_lte !== undefined && body.created_at_lte !== null)
  ) {
    whereClause.created_at = {};
    if (body.created_at_gte !== undefined && body.created_at_gte !== null) {
      whereClause.created_at.gte = body.created_at_gte;
    }
    if (body.created_at_lte !== undefined && body.created_at_lte !== null) {
      whereClause.created_at.lte = body.created_at_lte;
    }
  }

  if (
    (body.updated_at_gte !== undefined && body.updated_at_gte !== null) ||
    (body.updated_at_lte !== undefined && body.updated_at_lte !== null)
  ) {
    whereClause.updated_at = {};
    if (body.updated_at_gte !== undefined && body.updated_at_gte !== null) {
      whereClause.updated_at.gte = body.updated_at_gte;
    }
    if (body.updated_at_lte !== undefined && body.updated_at_lte !== null) {
      whereClause.updated_at.lte = body.updated_at_lte;
    }
  }

  if (body.deleted_at_null !== undefined && body.deleted_at_null !== null) {
    if (body.deleted_at_null === true) {
      whereClause.deleted_at = null;
    } else if (body.deleted_at_null === false) {
      whereClause.NOT = { deleted_at: null };
    }
  }

  let orderBy: { [key: string]: "asc" | "desc" } = { created_at: "desc" };
  if (body.order_by) {
    const orderStr = body.order_by.trim();
    const parts = orderStr.split(/\s+/);
    if (parts.length === 1 || parts.length === 2) {
      const field = parts[0];
      const direction = parts.length === 2 ? parts[1].toLowerCase() : "asc";
      if (
        [
          "id",
          "user_id",
          "social_provider_id",
          "external_user_id",
          "created_at",
          "updated_at",
          "deleted_at",
        ].includes(field) &&
        (direction === "asc" || direction === "desc")
      ) {
        orderBy = {};
        orderBy[field] = direction as "asc" | "desc";
      }
    }
  }

  const [records, total] = await Promise.all([
    MyGlobal.prisma.oauth_server_social_user_links.findMany({
      where: whereClause,
      orderBy,
      skip: offset,
      take: limit,
      select: {
        id: true,
        user_id: true,
        social_provider_id: true,
        external_user_id: true,
        access_token: true,
        refresh_token: true,
        token_expiry: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    }),
    MyGlobal.prisma.oauth_server_social_user_links.count({
      where: whereClause,
    }),
  ]);

  const data = records.map((record) => ({
    id: record.id as string & tags.Format<"uuid">,
    user_id: record.user_id as string & tags.Format<"uuid">,
    social_provider_id: record.social_provider_id as string &
      tags.Format<"uuid">,
    external_user_id: record.external_user_id,
    access_token: record.access_token ?? null,
    refresh_token: record.refresh_token ?? null,
    token_expiry: record.token_expiry
      ? toISOStringSafe(record.token_expiry)
      : null,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at: record.deleted_at ? toISOStringSafe(record.deleted_at) : null,
  }));

  const pages = Math.ceil(total / limit) as number &
    tags.Type<"int32"> &
    tags.Minimum<0>;

  return {
    pagination: {
      current: currentPage as number & tags.Type<"int32"> & tags.Minimum<0>,
      limit: limit as number & tags.Type<"int32"> & tags.Minimum<0>,
      records: total as number & tags.Type<"int32"> & tags.Minimum<0>,
      pages,
    },
    data,
  };
}
