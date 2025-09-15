import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsContentTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContentTag";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Creates a new content tag for content classification within the enterprise
 * LMS.
 *
 * This operation is restricted to system administrators. It generates a unique
 * UUID for the new tag, persists it in the database, and returns the newly
 * created tag including its ID, code, name, and optional description.
 *
 * @param props - Object including the authenticated system administrator and
 *   content tag creation data
 * @param props.systemAdmin - The system administrator performing this operation
 * @param props.body - The content tag creation data including code, name, and
 *   optional description
 * @returns The newly created content tag entity
 * @throws {Error} Throws an error if creation fails (e.g., due to duplicate
 *   code)
 */
export async function postenterpriseLmsSystemAdminContentTags(props: {
  systemAdmin: SystemadminPayload;
  body: IEnterpriseLmsContentTag.ICreate;
}): Promise<IEnterpriseLmsContentTag> {
  const { systemAdmin, body } = props;

  try {
    const created = await MyGlobal.prisma.enterprise_lms_content_tags.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        code: body.code,
        name: body.name,
        description: body.description ?? null,
      },
    });

    return {
      id: created.id,
      code: created.code,
      name: created.name,
      description: created.description ?? null,
    };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002" &&
      error.meta?.target?.includes("code")
    ) {
      throw new Error("A content tag with this code already exists.");
    }
    throw error;
  }
}
