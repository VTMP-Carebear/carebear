//@ts-nocheck
import { Request, Response } from 'express';
import User from '../models/User';
import { TypedRequest } from '../types/express';
import Task from '../models/Task';
import Notification from '../models/Notification';
import Group from '../models/Group';

interface UserBody {
  email: string;
  name: string;
  username?: string; // Changed from userID to username
  image?: string;
}

interface UserParams {
  id: string; // Represents either MongoDB ObjectID or username
}

export const isUserAdminOfGroup = async (userID: string, groupID: string): Promise<boolean> => {
  try {
    const group = await Group.findById(groupID);
    if (!group) {
      return false;
    }

    // Check if user is a member with admin role
    const adminMember = group.members.find(
      (member) => member.user.toString() === userID && member.role === 'admin'
    );

    return !!adminMember;
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
};

export const checkUserAdminStatus = async (req: any, res: any): Promise<void> => {
  try {
    const { userID, groupID } = req.params;

    if (!userID || !groupID) {
      res.status(400).json({ message: 'User ID and Group ID are required' });
      return;
    }

    const user = await User.findById(userID);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    const group = await Group.findById(groupID);
    if (!group) {
      res.status(404).json({ message: 'Group not found' });
      return;
    }

    const isAdmin = await isUserAdminOfGroup(userID, groupID);

    const memberInfo = group.members.find(
      (member) => member.user.toString() === userID
    );

    if (!memberInfo) {
      res.status(200).json({
        isAdmin: false,
        isMember: false,
        message: 'User is not a member of this group'
      });
      return;
    }

    res.status(200).json({
      isAdmin,
      isMember: true,
      role: memberInfo.role,
      familialRelation: memberInfo.familialRelation || null,
      groupName: group.name
    });

  } catch (err: any) {
    console.error('Error checking admin status:', err);
    res.status(500).json({ error: err.message });
  }
};

export const provideAdditionalUserInfo = async (req: any, res: any) => {
  try {
    const userID = req.params.userID;
    const {
      firstName,
      lastName,
      dateOfBirth,
      gender,
      weight,
      height
    } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !dateOfBirth || !gender || !weight || !height) {
      res.status(400).json({ message: 'Please fill out all fields to complete onboarding' });
      return;
    }

    // Find user and update onboarding data
    const updatedUser = await User.findByIdAndUpdate(
      userID,
      {
        $set: {
          firstName,
          lastName,
          dateOfBirth,
          gender,
          weight,
          height
        }
      },
      { new: true, runValidators: true }
    );
    
    if (!updatedUser) {
      res.status(404).json({ message: 'User not found' });
      return;
    }
    
    res.status(200).json({
      message: 'Additional info saved successfully',
      user: updatedUser
    });
  } catch (error: any) {}
}

// Get all groups for a user (main + additional)
export const getAllUserGroups = async (req: Request, res: Response) => {
  try {
    const { userID } = req.params;

    // Find the user - first without populating to check structure
    const user = await User.findById(userID);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Initialize result arrays to store IDs and formatted groups
    const groupIDs: string[] = [];
    
    // First add the main groupID if it exists
    if (user.groupID) {
      groupIDs.push(user.groupID.toString());
    }

    // Then add any additional groups
    if (user.additionalGroups && Array.isArray(user.additionalGroups)) {
      for (const group of user.additionalGroups) {
        if (group && group.groupID) {
          groupIDs.push(group.groupID.toString());
        }
      }
    }

    // Fetch all group data in one query
    const groups = await Group.find({ _id: { $in: groupIDs } });
    
    // Format groups for the frontend
    const formattedGroups = groups.map((group: any) => ({
      id: group._id.toString(),
      name: group.name
    }));

    // Return a response with both the IDs and formatted group objects
    return res.status(200).json({
      groupIDs: groupIDs,
      groups: formattedGroups
    });
    
  } catch (error: any) {
    console.error('Error fetching all user groups:', error);
    return res.status(500).json({ 
      message: 'Failed to fetch user groups',
      error: error.message 
    });
  }
};

// Get the groupID of a specific user
export const getUserGroup = async (req: Request, res: Response) => {
  try {
    const { userID } = req.params;

    const user = await User.findById(userID).select('groupID');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.status(200).json({ 
      groupID: user.groupID 
    });
    
  } catch (error: any) {
    console.error('Error fetching user group:', error);
    return res.status(500).json({ 
      message: 'Failed to fetch user group',
      error: error.message 
    });
  }
};

export const getUser = async (req: TypedRequest<any, UserParams>, res: Response): Promise<void> => {
  try {
    const { userID } = req.params;
    const user = await User.findById(userID);
    
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }
    
    res.status(200).json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// get all groups a user belongs to
export const getAllGroups = async (req: any, res: any): Promise<void> => {
  try {
    const { userID } = req.params;

    if (!userID) {
      res.status(400).json({ message: 'User ID is required' });
      return;
    }

    const user = await User.findById(userID);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    const groupIDs = [];

    if (user.groupID) {
      groupIDs.push(user.groupID);
    }

    if (user.additionalGroups && user.additionalGroups.length > 0) {
      const additionalGroupIDs = user.additionalGroups.map(group => group.groupID);
      groupIDs.push(...additionalGroupIDs);
    }

    res.status(200).json({
      message: 'User groups retrieved successfully',
      userID,
      groupIDs,
      totalGroups: groupIDs.length,
      hasAdditionalGroups: user.additionalGroups && user.additionalGroups.length > 0
    });

  } catch (err: any) {
    console.error('Error getting user groups:', err);
    res.status(500).json({ error: err.message });
  }
};


// PUT user info
export const updateUser = async (req: TypedRequest<Partial<UserBody>, UserParams>, res: Response): Promise<void> => {
  try {
    const userId = req.params.userID;
    const updates = req.body;
    
    // Don't allow email changes through this endpoint to prevent security issues
    if (updates.email) {
      delete updates.email;
    }
    
    // Find user and update, returning the updated document
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updates },
      { new: true, runValidators: true }
    );
    
    if (!updatedUser) {
      res.status(404).json({ message: 'User not found' });
      return;
    }
    
    res.status(200).json(updatedUser);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE user
export const deleteUser = async (req: TypedRequest<any, UserParams>, res: Response): Promise<void> => {
  try {
    const userID = req.params.userID;
      
    const deletedUser = await User.findByIdAndDelete(userID);
    
    if (!deletedUser) {
      res.status(404).json({ message: 'User not found' });
      return;
    }
    
    res.status(200).json({ message: 'User deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const getUserTasks = async (req: TypedRequest<any, { id: string }>, res: Response): Promise<void> => {
  try {
    const tasks = await Task.find({ assignedTo: req.params.userID })
      .populate('assignedBy', 'name')
      .sort({ deadline: 1 });
    
    res.json(tasks);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const getUserNotifications = async (req: TypedRequest<any, { id: string }>, res: Response): Promise<void> => {
  try {
    const notifications = await Notification.find({ userID: req.params.userID })
      .populate('taskID', 'description')
      .sort({ createdAt: -1 });
    
    res.json(notifications);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// Find user by clerkID
export const getUserIdByClerkId = async (req: Request, res: Response): Promise<void> => {
  try {
    const { clerkID } = req.params;

    if (!clerkID) {
      res.status(400).json({ message: 'clerkID is required' });
      return;
    }

    // Ensure clerkID is treated as a string
    const user = await User.findOne({ clerkID: String(clerkID) });

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    res.status(200).json({ userID: user._id });
  } catch (error: any) {
    console.error('Error fetching user by clerkID:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};


// Get full name and image URL of a user by userID
export const getUserInfo = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userID } = req.params;
    const user = await User.findById(userID).select('firstName lastName imageURL');
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }
    const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
    const imageURL = user.imageURL || null;
    res.status(200).json({ fullName, imageURL });
  } catch (error: any) {
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

// Get all family members of the group a user belongs to (including the user themselves)
export const getFamilyMembers = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userID } = req.params;
    const { groupID: requestedGroupID } = req.query; // optional query parameter
    
    const user = await User.findById(userID).select('groupID additionalGroups');
    if (!user || !user.groupID) {
      res.status(404).json({ message: 'User or group not found' });
      return;
    }
    
    // Determine which group to use
    let targetGroupID = user.groupID; 
    
    if (requestedGroupID) {
      targetGroupID = requestedGroupID as string;
    }

    const group = await Group.findById(targetGroupID).select('members');
    if (!group || !group.members) {
      res.status(404).json({ message: 'Group not found or has no members' });
      return;
    }

    // Include ALL members (including the current user)
    const allMembers = group.members;
    const memberUserIDs = allMembers.map((member: any) => member.user.toString());
    const users = await User.find({ _id: { $in: memberUserIDs } }).select('firstName lastName imageURL');

    const userMap = new Map();
    users.forEach(user => {
      userMap.set(user._id.toString(), user);
    });

    // Combine user info with role and familial relation from group members
    const familyMembers = allMembers.map((member: any) => {
      const userInfo = userMap.get(member.user.toString());
      return {
        userID: member.user,
        fullName: userInfo ? `${userInfo.firstName || ''} ${userInfo.lastName || ''}`.trim() : '',
        imageURL: userInfo?.imageURL || null,
        role: member.role,
        familialRelation: member.familialRelation || null,
      };
    });

    res.status(200).json(familyMembers);
  } catch (error: any) {
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

export const getCurrentUserFamilyRole = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userID } = req.params;
    const { groupID: requestedGroupID } = req.query; 
    
    const user = await User.findById(userID).select('groupID additionalGroups');
    if (!user || !user.groupID) {
      res.status(404).json({ message: 'User or group not found' });
      return;
    }
    
    // Determine which group to use
    let targetGroupID = user.groupID; 
    
    if (requestedGroupID) {
      targetGroupID = requestedGroupID as string;
    }

    const group = await Group.findById(targetGroupID).select('members');
    if (!group || !group.members) {
      res.status(404).json({ message: 'Group not found or has no members' });
      return;
    }

    // Find the current user's member info
    const currentUserMember = group.members.find((member: any) => member.user.toString() === userID);
    
    if (!currentUserMember) {
      res.status(404).json({ message: 'User is not a member of this group' });
      return;
    }

    const userRole = {
      role: currentUserMember.role,
      groupID: targetGroupID,
    };

    res.status(200).json(userRole);
  } catch (error: any) {
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

// Update user role in a specific group (admin only)
export const updateUserRole = async (req: Request, res: Response) => {
  try {
    const { userID, targetUserID } = req.params;
    const { role, groupID } = req.body;

    if (!userID || !targetUserID || !role || !groupID) {
      return res.status(400).json({ 
        message: 'User ID, target user ID, role, and group ID are required' 
      });
    }

    const validRoles = ['admin', 'caregiver', 'carereceiver'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ 
        message: 'Invalid role. Must be admin, caregiver, or carereceiver' 
      });
    }

    const isAdmin = await isUserAdminOfGroup(userID, groupID);
    if (!isAdmin) {
      return res.status(403).json({ 
        message: 'Only group admins can update user roles' 
      });
    }

    const group = await Group.findById(groupID);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Find the target user in the group
    const targetMemberIndex = group.members.findIndex(
      (member) => member.user.toString() === targetUserID
    );

    if (targetMemberIndex === -1) {
      return res.status(404).json({ 
        message: 'Target user is not a member of this group' 
      });
    }

    if (userID === targetUserID) {
      return res.status(400).json({ 
        message: 'Cannot change your own role' 
      });
    }

    // Update the role
    group.members[targetMemberIndex].role = role;
    await group.save();

    return res.status(200).json({ 
      message: 'User role updated successfully',
      updatedMember: {
        userID: targetUserID,
        role: role,
        groupID: groupID
      }
    });

  } catch (error: any) {
    console.error('Error updating user role:', error);
    return res.status(500).json({ 
      message: 'Internal server error',
      error: error.message 
    });
  }
};

// Get dashboard metrics for a user
// export const getUserMetrics = async (req: TypedRequest<any, { id: string }>, res: Response): Promise<void> => {
//   try {
//     // Tasks completed over time
//     const completedTasks = await Task.find({
//       assignedTo: req.params.userID,
//       status: 'done'
//     }).sort({ updatedAt: 1 });
    
//     // Get all dashboard entries for this user
//     const metrics = await Dashboard.find({ user: req.params.userID })
//       .populate('taskID', 'description')
//       .sort({ created_timestamp: -1 });
    
//     res.json({
//       completedTasks: completedTasks.length,
//       metrics
//     });
//   } catch (err: any) {
//     res.status(500).json({ error: err.message });
//   }
// };

export const updateNotificationPreferences = async(req: Request, res: Response): Promise<void> => {
  try {
    const {userID} = req.params;
    const { doNotDisturb, newFeed, newActivity, invites } = req.body;
    if (typeof doNotDisturb !== 'boolean' || 
        typeof newFeed !== 'boolean' || 
        typeof newActivity !== 'boolean' || 
        typeof invites !== 'boolean') {
      res.status(400).json({ 
        message: 'Invalid preferences format. All preference values must be boolean.' 
      });
      return;
    }

    // Find user and update notification preferences
    const updatedUser = await User.findByIdAndUpdate(
      userID,
      { 
        $set: { 
          notificationPreferences: { 
            doNotDisturb, 
            newFeed, 
            newActivity, 
            invites 
          } 
        } 
      },
      { new: true, runValidators: true }
    );
    
    if (!updatedUser) {
      res.status(404).json({ message: 'User not found' });
      return;
    }
    
    res.status(200).json({ 
      message: 'Notification preferences updated successfully',
      preferences: updatedUser.notificationPreferences 
    });
  } catch (error: any) {
    console.error('Error updating notification preferences:', error);
    res.status(500).json({ 
      message: 'Failed to update notification preferences',
      error: error.message 
    });
  }
};

// Add another function to get notification preferences
export const getNotificationPreferences = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userID } = req.params;
    
    const user = await User.findById(userID).select('notificationPreferences');
    
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }
    
    // If user doesn't have notification preferences yet, return defaults
    const preferences = user.notificationPreferences || {
      doNotDisturb: false,
      newFeed: true,
      newActivity: true,
      invites: true
    };
    
    res.status(200).json(preferences);
  } catch (error: any) {
    console.error('Error fetching notification preferences:', error);
    res.status(500).json({ 
      message: 'Failed to fetch notification preferences',
      error: error.message 
    });
  }
};