import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementDeveloper } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementDeveloper";
import { TpmPayload } from "../decorators/payload/TpmPayload";

export async function posttaskManagementTpmTaskManagementDevelopers(props: {
  tpm: TpmPayload;
  body: ITaskManagementDeveloper.ICreate;
}): Promise<ITaskManagementDeveloper> {
  const { tpm, body } = props;

  const now = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.task_management_developer.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      email: body.email,
      password_hash: body.password_hash,
      name: body.name,
      deleted_at: body.deleted_at ?? null,
      created_at: now,
      updated_at: now,
    },
  });

  return {
    id: created.id,
    email: created.email,
    password_hash: created.password_hash,
    name: created.name,
    deleted_at: created.deleted_at ?? null,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
  };
}
