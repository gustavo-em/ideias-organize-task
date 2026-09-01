import type { ShareGateway } from '../../../application/ports/ShareGateway';
import { ShareOperationError } from '../../../domain/ShareError';
import type { ListShare, TaskList } from '../../../domain/TaskList';
import type { Task } from '../../../domain/Task';

/**
 * A `ShareGateway` that keeps everything in memory, for tests and stories.
 * Same shape as `firestoreShareGateway`, minus the network.
 */
export function createInMemoryShareGateway(): ShareGateway {
  const projects = new Map<string, { list: TaskList; tasks: Task[] }>();
  let sequence = 0;

  return {
    async createLink(list, tasks, invitedAs, owner) {
      sequence += 1;
      const token = `mock-token-${sequence}`;
      const share: ListShare = { token, invitedAs, members: [owner] };

      projects.set(token, { list: { ...list, share }, tasks: [...tasks] });

      return share;
    },

    async revokeLink(share) {
      projects.delete(share.token);
    },

    async removeMember(share, personId) {
      const project = projects.get(share.token);
      if (project?.list.share == null) return;

      project.list = {
        ...project.list,
        share: {
          ...project.list.share,
          members: project.list.share.members.filter(
            member => member.personId !== personId,
          ),
        },
      };
    },

    async pull(share) {
      const project = projects.get(share.token);
      return project == null
        ? null
        : { list: project.list, tasks: project.tasks };
    },

    async push(share, list, tasks) {
      const project = projects.get(share.token);
      if (project == null) return;

      project.list = { ...list, share: project.list.share };
      project.tasks = [...tasks];
    },

    async joinByToken(token, member) {
      const project = projects.get(token);
      if (project?.list.share == null)
        throw new ShareOperationError('invalid-invite');

      const already = project.list.share.members.some(
        candidate => candidate.personId === member.personId,
      );
      if (!already) {
        project.list = {
          ...project.list,
          share: {
            ...project.list.share,
            members: [
              ...project.list.share.members,
              { ...member, joined: true },
            ],
          },
        };
      }

      return { list: project.list, tasks: project.tasks };
    },
  };
}
