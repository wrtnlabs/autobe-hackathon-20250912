import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEventRegistrationEventCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEventCategory";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieve detailed event category information by ID.
 *
 * This operation fetches a single event category from the database, including
 * all relevant details such as name, optional description, and timestamps. Only
 * admins with authorization can query this endpoint.
 *
 * @param props - The input properties.
 * @param props.admin - The authenticated admin user making the request.
 * @param props.eventCategoryId - The unique identifier (UUID) of the event
 *   category to retrieve.
 * @returns The detailed event category data conforming to
 *   IEventRegistrationEventCategory.
 * @throws {Error} Throws if the event category is not found with the given ID.
 */
export async function geteventRegistrationAdminEventCategoriesEventCategoryId(props: {
  admin: AdminPayload;
  eventCategoryId: string & tags.Format<"uuid">;
}): Promise<IEventRegistrationEventCategory> {
  const { admin, eventCategoryId } = props;

  const category =
    await MyGlobal.prisma.event_registration_event_categories.findUniqueOrThrow(
      {
        where: { id: eventCategoryId },
      },
    );

  return {
    id: category.id,
    name: category.name,
    description: category.description ?? null,
    created_at: toISOStringSafe(category.created_at),
    updated_at: toISOStringSafe(category.updated_at),
    deleted_at: category.deleted_at
      ? toISOStringSafe(category.deleted_at)
      : null,
  };
}
