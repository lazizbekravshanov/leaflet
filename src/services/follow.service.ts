import { NotFoundError, ValidationError } from "@/lib/errors";
import { followRepository } from "@/repositories/follow.repository";
import { userRepository } from "@/repositories/user.repository";

export const followService = {
  async follow(followerId: string, username: string) {
    const target = await userRepository.findByUsername(username);
    if (!target) throw new NotFoundError("User not found");
    // Also enforced by the CHECK constraint in the migration — validate here
    // for the friendly message, constrain there for the guarantee.
    if (target.id === followerId) {
      throw new ValidationError("You can't follow yourself");
    }
    await followRepository.follow(followerId, target.id);
  },

  async unfollow(followerId: string, username: string) {
    const target = await userRepository.findByUsername(username);
    if (!target) throw new NotFoundError("User not found");
    await followRepository.unfollow(followerId, target.id);
  },
};
