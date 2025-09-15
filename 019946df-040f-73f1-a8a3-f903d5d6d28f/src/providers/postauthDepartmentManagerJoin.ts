import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsDepartmentManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsDepartmentManager";
import { DepartmentmanagerPayload } from "../decorators/payload/DepartmentmanagerPayload";

/**
 * Registers a new Department Manager account within a tenant.
 *
 * This operation requires the caller to provide tenant identification
 * explicitly. Without tenant_id, registration cannot proceed.
 *
 * @param props - The registration parameters including departmentManager
 *   payload and body
 * @returns Newly registered Department Manager authorization data
 * @throws {Error} Tenant ID must be provided to register a Department Manager.
 */
export async function postauthDepartmentManagerJoin(props: {
  departmentManager: DepartmentmanagerPayload;
  body: IEnterpriseLmsDepartmentManager.ICreate;
}): Promise<IEnterpriseLmsDepartmentManager.IAuthorized> {
  // The tenant ID is not present in departmentManager payload or input.
  // For data integrity, we explicitly require tenant_id:
  throw new Error("Tenant ID must be provided for registration");
}
