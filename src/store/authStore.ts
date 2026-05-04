import { ref } from 'vue';

export interface UserProfile {
  name: string;
  avatar: string;
  vipLevel: number;
  email: string;
}

const isLoggedIn = ref(false);
const userProfile = ref<UserProfile | null>(null);

if (typeof window !== 'undefined') {
  const savedAuth = localStorage.getItem('tradex_auth');
  if (savedAuth) {
    const authData = JSON.parse(savedAuth);
    isLoggedIn.value = authData.isLoggedIn;
    userProfile.value = authData.userProfile;
  }
}

const saveAuth = () => {
  localStorage.setItem('tradex_auth', JSON.stringify({
    isLoggedIn: isLoggedIn.value,
    userProfile: userProfile.value
  }));
};

export const login = () => {
  isLoggedIn.value = true;
  userProfile.value = {
    name: 'MOBEEN',
    avatar: '', // Can be an image URL later
    vipLevel: 5,
    email: 'mobeen@tradex.com'
  };
  saveAuth();
};

export const logout = () => {
  isLoggedIn.value = false;
  userProfile.value = null;
  saveAuth();
};

export { isLoggedIn, userProfile };
