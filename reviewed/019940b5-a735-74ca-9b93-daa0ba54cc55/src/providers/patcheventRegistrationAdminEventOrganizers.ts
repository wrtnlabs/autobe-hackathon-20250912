import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEventRegistrationEventOrganizer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEventOrganizer";
import { IPageIEventRegistrationEventOrganizer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEventRegistrationEventOrganizer";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Lists and searches event organizers with filtering and pagination.
 *
 * Retrieves a filtered and paginated list of event organizers from the
 * database. Supports filtering by email, full_name, email_verified, and
 * phone_number. Supports pagination and sorting by email, full_name, or
 * created_at.
 *
 * @param props - Object containing admin authentication and request body
 * @param props.admin - The authenticated admin user making the request
 * @param props.body - Filtering and pagination parameters
 * @returns A paginated summary list of event organizers
 * @throws {Error} Throws error if database query fails
 */
export async function patcheventRegistrationAdminEventOrganizers(props: {
  admin: AdminPayload;
  body: IEventRegistrationEventOrganizer.IRequest;
}): Promise<IPageIEventRegistrationEventOrganizer.ISummary> {
  const { admin, body } = props;

  // Default paging values
  const page = body.page ?? 1;
  const limit = body.limit ?? 10;
  const skip = (page - 1) * limit;

  // Build query 'where' filter
  const where: {
    email?: string | null;
    full_name?: string | null;
    email_verified?: boolean | null;
    phone_number?: string | null;
  } = {};

  if (body.email !== undefined && body.email !== null) {
    where.email = body.email;
  }

  if (body.full_name !== undefined && body.full_name !== null) {
    where.full_name = body.full_name;
  }

  if (body.email_verified !== undefined && body.email_verified !== null) {
    where.email_verified = body.email_verified;
  }

  if (body.phone_number !== undefined && body.phone_number !== null) {
    where.phone_number = body.phone_number;
  }

  // Validate and determine orderBy and orderDirection
  const validOrderByFields = ["email", "full_name", "created_at"];
  let orderByKey: "email" | "full_name" | "created_at" = "created_at";

  if (body.orderBy && validOrderByFields.includes(body.orderBy)) {
    orderByKey = body.orderBy as "email" | "full_name" | "created_at";
  }

  const orderDirection = body.orderDirection === "asc" ? "asc" : "desc";

  // Execute parallel Prisma queries
  const [data, total] = await Promise.all([
    MyGlobal.prisma.event_registration_event_organizers.findMany({
      where,
      orderBy: { [orderByKey]: orderDirection },
      skip,
      take: limit,
      select: {
        id: true,
        email: true,
        full_name: true,
        email_verified: true,
        phone_number: true,
        profile_picture_url: true,
        created_at: true,
        updated_at: true,
      },
    }),
    MyGlobal.prisma.event_registration_event_organizers.count({ where }),
  ]);

  // Map database results to API response type
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: data.map((row) => ({
      id: row.id,
      email: row.email,
      full_name: row.full_name,
      email_verified: row.email_verified,
      phone_number: row.phone_number ?? null,
      profile_picture_url: row.profile_picture_url ?? null,
      created_at: toISOStringSafe(row.created_at),
      updated_at: toISOStringSafe(row.updated_at),
    })),
  };
}
