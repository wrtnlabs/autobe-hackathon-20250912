import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ViewerPayload } from "../decorators/payload/ViewerPayload";

/**
 * Soft delete a FlexOffice viewer user by marking deleted_at timestamp.
 *
 * This operation ensures the target viewer identified by viewerId exists and is
 * active, then performs a soft deletion by setting deleted_at to the current
 * timestamp. Only authorized viewers can perform this operation.
 *
 * @param props - Operation props including authenticated viewer and target
 *   viewerId
 * @param props.viewer - Authenticated viewer performing the deletion
 * @param props.viewerId - UUID of the viewer to be soft deleted
 * @returns Void
 * @throws {Error} Throws error if the target viewer does not exist or is
 *   already deleted
 */
export async function deleteflexOfficeViewerViewersViewerId(props: {
  viewer: ViewerPayload;
  viewerId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { viewer, viewerId } = props;

  const existingViewer =
    await MyGlobal.prisma.flex_office_viewers.findUniqueOrThrow({
      where: { id: viewerId },
      // We check only id here. If soft delete status must be checked, handle separately
    });

  if (
    existingViewer.deleted_at !== null &&
    existingViewer.deleted_at !== undefined
  ) {
    throw new Error("Viewer user is already deleted");
  }

  const deletedAt = toISOStringSafe(new Date());

  await MyGlobal.prisma.flex_office_viewers.update({
    where: { id: viewerId },
    data: { deleted_at: deletedAt },
  });
}
