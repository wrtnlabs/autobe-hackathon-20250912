import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficeEditor } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeEditor";
import { IPageIFlexOfficeEditor } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIFlexOfficeEditor";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Provides a paginated list of Editor users for administrative management.
 *
 * Returns editor summaries filtered by search criteria including name and
 * email, supports pagination, and excludes soft-deleted records.
 *
 * Requires admin authorization.
 *
 * @param props - Object containing admin authorization payload and search
 *   request body
 * @param props.admin - The authenticated admin user performing this operation
 * @param props.body - Search and pagination criteria for editors
 * @returns A paginated summary of editor records matching the criteria
 * @throws {Error} Propagates errors from Prisma client or authorization
 *   failures
 */
export async function patchflexOfficeAdminEditors(props: {
  admin: AdminPayload;
  body: IFlexOfficeEditor.IRequest;
}): Promise<IPageIFlexOfficeEditor.ISummary> {
  const { body } = props;

  const page = (body.page ?? 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<1> as number;
  const limit = (body.limit ?? 10) as number &
    tags.Type<"int32"> &
    tags.Minimum<1> as number;
  const skip = (page - 1) * limit;

  const where: { deleted_at: null; OR?: { name: { contains: string } }[] } = {
    deleted_at: null,
  };

  if (body.search !== undefined && body.search !== null && body.search !== "") {
    where.OR = [
      { name: { contains: body.search } },
      { email: { contains: body.search } },
    ];
  }

  const [total, editors] = await Promise.all([
    MyGlobal.prisma.flex_office_editors.count({ where }),
    MyGlobal.prisma.flex_office_editors.findMany({
      where,
      select: { id: true, name: true, email: true },
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
    }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: editors.map((e) => ({
      id: e.id as string & tags.Format<"uuid">,
      name: e.name,
      email: e.email,
    })),
  };
}
