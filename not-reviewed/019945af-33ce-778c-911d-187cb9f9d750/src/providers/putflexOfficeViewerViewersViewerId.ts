import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficeViewer } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeViewer";
import { ViewerPayload } from "../decorators/payload/ViewerPayload";

/**
 * Update a specific FlexOffice viewer user.
 *
 * This operation updates the details of a viewer user identified by their
 * unique UUID. The authenticated viewer can only update their own profile.
 *
 * @param props - Contains the authenticated viewer, the viewer's UUID, and the
 *   update body.
 * @param props.viewer - Authenticated viewer payload.
 * @param props.viewerId - UUID of the viewer to update.
 * @param props.body - Update data conforming to IFlexOfficeViewer.IUpdate.
 * @returns The updated viewer user without password hash.
 * @throws {Error} When the viewer is not found or unauthorized access occurs.
 */
export async function putflexOfficeViewerViewersViewerId(props: {
  viewer: ViewerPayload;
  viewerId: string & tags.Format<"uuid">;
  body: IFlexOfficeViewer.IUpdate;
}): Promise<IFlexOfficeViewer> {
  const { viewer, viewerId, body } = props;

  if (viewer.id !== viewerId) {
    throw new Error("Unauthorized: Can only update your own profile");
  }

  const exist = await MyGlobal.prisma.flex_office_viewers.findFirst({
    where: { id: viewerId, deleted_at: null },
  });

  if (!exist) throw new Error("Viewer user not found");

  const updated = await MyGlobal.prisma.flex_office_viewers.update({
    where: { id: viewerId },
    data: {
      name: body.name ?? undefined,
      email: body.email ?? undefined,
      password_hash: body.password_hash ?? undefined,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  return {
    id: updated.id,
    name: updated.name,
    email: updated.email,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
