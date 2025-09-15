import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEventRegistrationEventCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEventCategory";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Update an existing event category by its unique ID.
 *
 * This operation allows admin users to update the name, description, and soft
 * delete timestamp of an event category identified by eventCategoryId.
 *
 * @param props - Object containing admin user info, eventCategoryId, and update
 *   body
 * @param props.admin - The authenticated admin initiating the update
 * @param props.eventCategoryId - UUID of the event category to update
 * @param props.body - Update payload including optional name, description, and
 *   deleted_at
 * @returns The updated event category, with all timestamps converted to ISO
 *   string formats
 * @throws {Error} When the event category with the specified ID does not exist
 */
export async function puteventRegistrationAdminEventCategoriesEventCategoryId(props: {
  admin: AdminPayload;
  eventCategoryId: string & tags.Format<"uuid">;
  body: IEventRegistrationEventCategory.IUpdate;
}): Promise<IEventRegistrationEventCategory> {
  const { admin, eventCategoryId, body } = props;

  await MyGlobal.prisma.event_registration_event_categories.findUniqueOrThrow({
    where: { id: eventCategoryId },
  });

  const updated =
    await MyGlobal.prisma.event_registration_event_categories.update({
      where: { id: eventCategoryId },
      data: {
        name: body.name ?? undefined,
        description: body.description ?? undefined,
        deleted_at: body.deleted_at ?? undefined,
        updated_at: toISOStringSafe(new Date()),
      },
    });

  return {
    id: updated.id as string & tags.Format<"uuid">,
    name: updated.name,
    description: updated.description ?? null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
