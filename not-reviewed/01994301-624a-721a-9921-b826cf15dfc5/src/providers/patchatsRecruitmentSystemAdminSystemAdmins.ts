import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentSystemAdmin";
import { IPageIAtsRecruitmentSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAtsRecruitmentSystemAdmin";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Search and retrieve a paginated list of system administrators
 * (ats_recruitment_systemadmins table).
 *
 * This endpoint enables privileged users (system admin) to search for and list
 * all system administrator accounts. Filtering supports name and email search,
 * and pagination via page and limit parameters. Results only include essential
 * metadata—never sensitive credential fields. Only accessible by authenticated
 * systemadmin users. Returns IPageIAtsRecruitmentSystemAdmin.ISummary.
 *
 * @param props - Properties to execute the query
 * @param props.systemAdmin - Authenticated systemadmin payload (authorization
 *   required)
 * @param props.body - Optional filters (search, page, limit) for pagination and
 *   search
 * @returns Paginated list of admin account summaries and pagination info
 * @throws {Error} If authentication fails or query encounters a database error
 */
export async function patchatsRecruitmentSystemAdminSystemAdmins(props: {
  systemAdmin: SystemadminPayload;
  body: IAtsRecruitmentSystemAdmin.IRequest;
}): Promise<IPageIAtsRecruitmentSystemAdmin.ISummary> {
  const { body } = props;
  // Normalize pagination input values, fallback to defaults if absent/invalid
  const rawPage = body.page != null ? body.page : undefined;
  const rawLimit = body.limit != null ? body.limit : undefined;
  // Ensure page and limit are positive integers (minimum 1)
  const page = rawPage && rawPage > 0 ? rawPage : 1;
  const limit = rawLimit && rawLimit > 0 ? rawLimit : 20;
  const skip = (page - 1) * limit;

  // Prepare Prisma where clause; always exclude deleted accounts
  const where = {
    deleted_at: null,
    ...(body.search &&
      typeof body.search === "string" &&
      body.search.trim() !== "" && {
        OR: [
          { name: { contains: body.search } },
          { email: { contains: body.search } },
        ],
      }),
  };

  // Query paginated admins and total count in parallel
  const [admins, total] = await Promise.all([
    MyGlobal.prisma.ats_recruitment_systemadmins.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        super_admin: true,
        is_active: true,
      },
      orderBy: { created_at: "desc" },
      skip: Number(skip),
      take: Number(limit),
    }),
    MyGlobal.prisma.ats_recruitment_systemadmins.count({ where }),
  ]);

  // Brand id and email fields using typia.assert to ensure Format<"uuid"> and Format<"email">
  const safeAdmins = admins.map((row) => {
    typia.assertGuard<{
      id: string & tags.Format<"uuid">;
      email: string & tags.Format<"email">;
    }>({ id: row.id, email: row.email });
    return {
      id: row.id,
      email: row.email,
      name: row.name,
      super_admin: row.super_admin,
      is_active: row.is_active,
    };
  });

  // Calculate total pages (minimum 1)
  const pages = limit > 0 ? Math.max(1, Math.ceil(total / limit)) : 1;

  // Return pagination and admin data (correct brands)
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: Number(total),
      pages: Number(pages),
    },
    data: safeAdmins,
  };
}
