import { View, Text, Pressable, ScrollView, Alert, ActivityIndicator, TouchableOpacity, Modal } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import AddFamily from './add_family';
import { useAuth } from '@clerk/clerk-expo';
import axios from 'axios';

// Define the FamilyMember type
interface FamilyMember {
  name: string;
  age: number;
  status: string;
  isStarred?: boolean;
}

// Define the Family type
interface Family {
  id: string;
  name: string;
}

export default function Family() {
  const { isSignedIn, userId } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('Family 1');
  const [modalVisible, setModalVisible] = useState(false);

  // Daily status modal states
  const [showDailyModal, setShowDailyModal] = useState(false);
  const [selectedMood, setSelectedMood] = useState('');
  const [selectedBodyFeeling, setSelectedBodyFeeling] = useState('');
  const [isSubmittingStatus, setIsSubmittingStatus] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);
  const [userID, setUserID] = useState(null);
  
  // Available families 
  const [availableFamilies, setAvailableFamilies] = useState<Family[]>([
    { id: '1', name: 'Family 1' },
    { id: '2', name: 'Family 2' },
  ]);

  const familyMembers: FamilyMember[] = [
    { name: 'Grandpa', age: 79, status: 'Currently alive and healthy' },
    { name: 'Grandma', age: 75, status: 'Currently alive and healthy' },
    { name: 'Mom', age: 49, status: 'Currently alive and healthy' },
    { name: 'Dad', age: 49, status: 'Currently alive and healthy' },
    { name: 'Sister', age: 19, status: 'Currently alive and healthy', isStarred: true },
  ];

  const moods = [
    { id: 'happy', label: '😊 Happy', value: 'happy' },
    { id: 'excited', label: '🤩 Excited', value: 'excited' },
    { id: 'sad', label: '😢 Sad', value: 'sad' },
    { id: 'angry', label: '😠 Angry', value: 'angry' },
    { id: 'nervous', label: '😬 Nervous', value: 'nervous' },
    { id: 'peaceful', label: '🧘 Peaceful', value: 'peaceful' },
  ];

  const bodyFeelings = [
    { id: 'energized', label: '⚡ Energized', value: 'energized' },
    { id: 'sore', label: '💪 Sore', value: 'sore' },
    { id: 'tired', label: '😴 Tired', value: 'tired' },
    { id: 'sick', label: '🤒 Sick', value: 'sick' },
    { id: 'relaxed', label: '😌 Relaxed', value: 'relaxed' },
    { id: 'tense', label: '😣 Tense', value: 'tense' },
  ];

  // Check if user has submitted daily status
  useEffect(() => {
    const checkDailyStatus = async () => {
      if (isSignedIn && userId) {
        setIsCheckingStatus(true);
        try {
          // Step 1: Fetch userID using clerkID
          const userResponse = await axios.get(`https://carebear-backend.onrender.com/api/users/clerk/${userId}`);
          const fetchedUserID = userResponse.data.userID;
          setUserID(fetchedUserID);

          // Step 2: Check if user has submitted today
          const statusResponse = await axios.get(`https://carebear-backend.onrender.com/api/daily/check/${fetchedUserID}`);
          
          // If user hasn't submitted today, show the modal
          if (!statusResponse.data.hasSubmittedToday) {
            setShowDailyModal(true);
          }
        } catch (error) {
          console.error('Error checking daily status:', error);
          // Show modal on error to be safe
          setShowDailyModal(true);
        } finally {
          setIsCheckingStatus(false);
        }
      }
    };

    checkDailyStatus();
  }, [isSignedIn, userId]);

  // Handle daily status submission
  const handleSubmitDailyStatus = async () => {
    if (!selectedMood || !selectedBodyFeeling) {
      Alert.alert('Missing Information', 'Please select both your mood and body feeling.');
      return;
    }

    if (!userID) {
      Alert.alert('Error', 'User ID not found. Please try again.');
      return;
    }

    try {
      setIsSubmittingStatus(true);

      // Submit daily status to backend (userID in endpoint, only mood and body fields)
      await axios.post(`https://carebear-backend.onrender.com/api/daily/submit/${userID}`, {
        mood: selectedMood,
        body: selectedBodyFeeling,
      });

      // Reset selections
      setSelectedMood('');
      setSelectedBodyFeeling('');

      // Hide modal
      setShowDailyModal(false);

      Alert.alert('Success', 'Your daily status has been updated!');
    } catch (error) {
      console.error('Error submitting daily status:', error);
      Alert.alert('Error', 'Failed to update your status. Please try again.');
    } finally {
      setIsSubmittingStatus(false);
    }
  };

  
  const handleMemberPress = (member: FamilyMember) => {
    router.push({
      pathname: '/(protected)/dashboard/mydashboard/member-dashboard',
      params: { 
        name: member.name, 
        age: member.age.toString(),
        status: member.status
      }
    });
  };

  // Function to add a new family
  const handleAddFamily = (familyName: string) => {
    // Generate a new id
    const newId = (availableFamilies.length + 1).toString();
    
    // Create the new family
    const newFamily = {
      id: newId,
      name: familyName
    };
    
    // Add to families array
    const updatedFamilies = [...availableFamilies, newFamily];
    setAvailableFamilies(updatedFamilies);
    
    // Automatically switch to the new family tab
    setActiveTab(newFamily.name);
    
    // Close modal
    setModalVisible(false);
    
    // Show success message
    Alert.alert('Success', `Family "${newFamily.name}" has been created`);
  };

  const renderOptionButton = (
    option: { id: string; label: string; value: string },
    selectedValue: string,
    onSelect: (value: string) => void
  ) => (
    <TouchableOpacity
      key={option.id}
      className={`px-4 py-2 rounded-full border-2 m-1 ${
        selectedValue === option.value 
          ? 'border-blue-500 bg-blue-500' 
          : 'border-gray-300 bg-gray-100'
      }`}
      onPress={() => onSelect(option.value)}
    >
      <Text className={`text-sm ${
        selectedValue === option.value ? 'text-white font-semibold' : 'text-gray-700'
      }`}>
        {option.label}
      </Text>
    </TouchableOpacity>
  );

  // Show loading screen while checking status
  if (isCheckingStatus) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <ActivityIndicator size="large" color="#007AFF" />
        <Text className="mt-4 text-gray-600">Loading...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1">
      <ScrollView className="flex-1">
        {/* You Member Section */}
        <View className="px-4 mt-4">
          <View className="flex-row items-center bg-white p-4 rounded-lg">
            {/* Profile Icon */}
            <View className="w-12 h-12 bg-gray-300 rounded-full items-center justify-center mr-4">
              <MaterialIcons name="person" size={24} color="white" />
            </View>

            {/* Member Info */}
            <View className="flex-1">
              <Text className="text-sm font-medium text-gray-800">You</Text>
              <Text className="text-xs text-gray-500">Currently alive and healthy</Text>
            </View>

            {/* Age */}
            <Text className="text-sm font-medium text-gray-800">22</Text>
          </View>
        </View>

        {/* Family Management Header */}
        <View className="px-4 mt-4">
          <View className="flex-row justify-between items-center">
            <Text className="text-sm font-medium text-gray-800">{availableFamilies.length} {availableFamilies.length === 1 ? 'Family' : 'Families'}</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-end' }}
            >
              {availableFamilies.map((family) => (
                <Pressable 
                  key={family.id}
                  className="px-4 py-2 active:opacity-80 relative"
                  onPress={() => setActiveTab(family.name)}
                >
                  <Text 
                    className={`text-sm font-medium ${activeTab === family.name ? 'text-[#1A0933]' : 'text-gray-500'}`}
                  >
                    {family.name}
                  </Text>
                  {activeTab === family.name && (
                    <View className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#1A0933]" />
                  )}
                </Pressable>
              ))}
              <Pressable 
                className="px-3 py-2 active:opacity-70"
                onPress={() => setModalVisible(true)}
              >
                <Text className="text-sm text-blue-500">Add</Text>
              </Pressable>
            </ScrollView>
          </View>

          {/* Family Members */}
          <View className="mt-4 mb-6">
            {familyMembers.map((member, index) => (
              <Pressable
                key={index}
                className="mb-4 active:opacity-90 active:scale-[0.99]"
                android_ripple={{ color: 'rgba(0, 0, 0, 0.05)' }}
                onPress={() => handleMemberPress(member)}
              >
                <View className="flex-row items-center bg-white p-4 rounded-lg shadow-sm">
                  {/* Profile Icon */}
                  <View className="w-12 h-12 bg-gray-300 rounded-full items-center justify-center mr-4">
                    <MaterialIcons name="person" size={24} color="white" />
                  </View>

                  {/* Member Info */}
                  <View className="flex-1">
                    <Text className="text-sm font-medium text-gray-800">{member.name}</Text>
                    <Text className="text-xs text-gray-500">{member.status}</Text>
                  </View>

                  {/* Age and Star */}
                  <View className="flex-row items-center">
                    <Text className="text-sm font-medium text-gray-800 mr-2">{member.age}</Text>
                    {member.isStarred && (
                      <MaterialIcons name="star" size={20} color="black" />
                    )}
                  </View>
                </View>
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Add Family Modal Component */}
      <AddFamily
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onAddFamily={handleAddFamily}
      />

      {/* Daily Status Modal */}
      <Modal
        visible={showDailyModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {}} // Prevent closing with back button
      >
        <View className="flex-1 bg-black bg-opacity-50 justify-center items-center">
          <View className="bg-white m-5 rounded-3xl p-6 items-center shadow-lg max-h-4/5">
            <Text className="text-2xl font-bold mb-2 text-center">Daily Check-in</Text>
            <Text className="text-base text-gray-600 text-center mb-6">
              Before you continue, let's check in on how you're feeling today!
            </Text>

            {/* Mood Section */}
            <View className="w-full mb-6">
              <Text className="text-lg font-semibold mb-3 text-center">How is your mood today?</Text>
              <View className="flex-row flex-wrap justify-center">
                {moods.map((mood) =>
                  renderOptionButton(mood, selectedMood, setSelectedMood)
                )}
              </View>
            </View>

            {/* Body Feeling Section */}
            <View className="w-full mb-6">
              <Text className="text-lg font-semibold mb-3 text-center">How does your body feel?</Text>
              <View className="flex-row flex-wrap justify-center">
                {bodyFeelings.map((feeling) =>
                  renderOptionButton(feeling, selectedBodyFeeling, setSelectedBodyFeeling)
                )}
              </View>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              className={`w-full py-4 rounded-full items-center mt-2 ${
                (!selectedMood || !selectedBodyFeeling || isSubmittingStatus) 
                  ? 'bg-gray-300' 
                  : 'bg-blue-500'
              }`}
              onPress={handleSubmitDailyStatus}
              disabled={!selectedMood || !selectedBodyFeeling || isSubmittingStatus}
            >
              {isSubmittingStatus ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-white text-lg font-semibold">Continue to App</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}