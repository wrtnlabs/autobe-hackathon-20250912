import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEventRegistrationEventCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEventCategory";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Create a new event category with a unique name and optional description.
 *
 * Only admin users are authorized to perform this operation to maintain
 * controlled event categorization.
 *
 * This operation maps to the event_registration_event_categories table and
 * ensures the uniqueness of category names.
 *
 * Upon successful creation, the full event category record is returned with
 * assigned timestamps.
 *
 * @param props - Object containing the authenticated admin and the event
 *   category creation details
 * @param props.admin - Authenticated admin user performing the creation
 * @param props.body - Data required to create a new event category, including
 *   name and optional description
 * @returns The newly created event category record
 * @throws {Error} Throws if creation fails due to uniqueness or database errors
 */
export async function posteventRegistrationAdminEventCategories(props: {
  admin: AdminPayload;
  body: IEventRegistrationEventCategory.ICreate;
}): Promise<IEventRegistrationEventCategory> {
  const { admin, body } = props;

  // Generate a new UUID for the category ID with correct branding
  const id = v4() as unknown as string & tags.Format<"uuid">;

  // Current timestamp in ISO 8601 string format with correct branding
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  const created =
    await MyGlobal.prisma.event_registration_event_categories.create({
      data: {
        id,
        name: body.name,
        description: body.description ?? null,
        created_at: now,
        updated_at: now,
        // deleted_at deliberately omitted for creation
      },
    });

  return {
    id: created.id,
    name: created.name,
    description: created.description ?? null,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
