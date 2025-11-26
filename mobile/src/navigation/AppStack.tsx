import { createNativeStackNavigator } from '@react-navigation/native-stack'
import type { AppStackParamList } from '../types'
import DashboardScreen from '../screens/DashboardScreen'
import LinksScreen from '../screens/LinksScreen'
import CatalogScreen from '../screens/CatalogScreen'
import OrdersScreen from '../screens/OrdersScreen'
import ChatListScreen from '../screens/ChatListScreen'
import ChatThreadScreen from '../screens/ChatThreadScreen'
import ComplaintsScreen from '../screens/ComplaintsScreen'

const Stack = createNativeStackNavigator<AppStackParamList>()

export default function AppStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: '#3b82f6',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen 
        name="Dashboard" 
        component={DashboardScreen}
        options={{ title: 'Dashboard' }}
      />
      <Stack.Screen 
        name="Links" 
        component={LinksScreen}
        options={{ title: 'Supplier Links' }}
      />
      <Stack.Screen 
        name="Catalog" 
        component={CatalogScreen}
        options={{ title: 'Product Catalog' }}
      />
      <Stack.Screen 
        name="Orders" 
        component={OrdersScreen}
        options={{ title: 'Orders' }}
      />
      <Stack.Screen 
        name="ChatList" 
        component={ChatListScreen}
        options={{ title: 'Chats' }}
      />
      <Stack.Screen 
        name="ChatThread" 
        component={ChatThreadScreen}
        options={{ title: 'Chat' }}
      />
      <Stack.Screen 
        name="Complaints" 
        component={ComplaintsScreen}
        options={{ title: 'Complaints' }}
      />
    </Stack.Navigator>
  )
}

