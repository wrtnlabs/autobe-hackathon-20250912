import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IOauthServerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerMember";
import { IPageIOauthServerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIOauthServerMember";
import { MemberPayload } from "../decorators/payload/MemberPayload";

/**
 * Search and list oauthServerMember entities
 *
 * This operation retrieves a paginated list of oauthServerMember entities with
 * advanced filtering and searching capabilities. Members represent registered
 * users authenticated via email/password and social login. The response
 * contains summaries of members including essential profile and authentication
 * data but excludes sensitive fields like password hashes. This endpoint
 * supports pagination, sorting, and filters according to the
 * IOauthServerMember.IRequest interface properties.
 *
 * Authorization requires 'member' role as it exposes member information.
 *
 * @param props - An object containing the authenticated member and request body
 *   for filtering, sorting, and pagination.
 * @param props.member - The authenticated member payload used for
 *   authorization.
 * @param props.body - The request body containing filtering, sorting, and
 *   pagination criteria.
 * @returns A paginated list of OAuth server member summaries.
 * @throws {Error} When any error occurs during the database retrieval or
 *   processing.
 */
export async function patchoauthServerMemberOauthServerMembers(props: {
  member: MemberPayload;
  body: IOauthServerMember.IRequest;
}): Promise<IPageIOauthServerMember.ISummary> {
  const { member, body } = props;

  const page = (body.page ?? 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const limit = (body.limit ?? 10) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;

  const whereConditions = {
    deleted_at: null,
    ...(body.email !== undefined &&
      body.email !== null && {
        email: { contains: body.email },
      }),
    ...(body.email_verified !== undefined &&
      body.email_verified !== null && {
        email_verified: body.email_verified,
      }),
  };

  const [members, total] = await Promise.all([
    MyGlobal.prisma.oauth_server_members.findMany({
      where: whereConditions,
      orderBy: { created_at: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        email: true,
        email_verified: true,
        created_at: true,
        updated_at: true,
      },
    }),
    MyGlobal.prisma.oauth_server_members.count({
      where: whereConditions,
    }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: members.map((member) => ({
      id: member.id,
      email: member.email,
      email_verified: member.email_verified,
      created_at: toISOStringSafe(member.created_at),
      updated_at: toISOStringSafe(member.updated_at),
    })),
  };
}
