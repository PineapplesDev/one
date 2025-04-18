// Copyright © 2024 650 Industries.
import {
  StackRouter,
  useNavigationBuilder,
  type RouterFactory,
} from '@react-navigation/native'
import * as React from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFilterScreenChildren } from '../layouts/withLayoutContext'
import { useContextKey } from '../router/Route'
import { useSortedScreens } from '../router/useScreens'
import { Screen } from './Screen'
import { FlagsContext } from '../router/FlagsContext'

type NavigatorTypes = ReturnType<typeof useNavigationBuilder>

// TODO: This might already exist upstream, maybe something like `useCurrentRender` ?
export const NavigatorContext = React.createContext<{
  contextKey: string
  state: NavigatorTypes['state']
  navigation: NavigatorTypes['navigation']
  descriptors: NavigatorTypes['descriptors']
  router: RouterFactory<any, any, any>
} | null>(null)

if (process.env.NODE_ENV !== 'production') {
  NavigatorContext.displayName = 'NavigatorContext'
}

export type NavigatorProps = {
  initialRouteName?: Parameters<typeof useNavigationBuilder>[1]['initialRouteName']
  screenOptions?: Parameters<typeof useNavigationBuilder>[1]['screenOptions']
  children?: Parameters<typeof useNavigationBuilder>[1]['children']
  router?: Parameters<typeof useNavigationBuilder>[0]
}

/** An unstyled custom navigator. Good for basic web layouts */
export function Navigator({
  initialRouteName,
  screenOptions,
  children,
  router,
}: NavigatorProps) {
  const contextKey = useContextKey()

  // Allows adding Screen components as children to configure routes.
  const { screens, children: otherSlot } = useFilterScreenChildren(children, {
    isCustomNavigator: true,
    contextKey,
  })

  const sorted = useSortedScreens(screens ?? [])

  if (!sorted.length) {
    console.warn(`Navigator at "${contextKey}" has no children.`)
    return null
  }

  return (
    <QualifiedNavigator
      initialRouteName={initialRouteName}
      screenOptions={screenOptions}
      screens={sorted}
      contextKey={contextKey}
      router={router}
    >
      {otherSlot}
    </QualifiedNavigator>
  )
}

function QualifiedNavigator({
  initialRouteName,
  screenOptions,
  children,
  screens,
  contextKey,
  router = StackRouter,
}: NavigatorProps & { contextKey: string; screens: React.ReactNode[] }) {
  const { state, navigation, descriptors, NavigationContent } = useNavigationBuilder(
    router,
    {
      // Used for getting the parent with navigation.getParent('/normalized/path')
      id: contextKey,
      children: screens,
      screenOptions,
      initialRouteName,
    }
  )

  const value = React.useMemo(() => {
    return {
      contextKey,
      state,
      navigation,
      descriptors,
      router,
    }
  }, [contextKey, state, navigation, descriptors, router])

  return (
    <NavigatorContext.Provider value={value}>
      <NavigationContent>{children}</NavigationContent>
    </NavigatorContext.Provider>
  )
}

export function useNavigatorContext() {
  const context = React.useContext(NavigatorContext)
  if (!context) {
    throw new Error('useNavigatorContext must be used within a <Navigator />')
  }
  return context
}

export function useSlot() {
  const context = useNavigatorContext()
  const flags = React.useContext(FlagsContext)

  const { state, descriptors } = context

  const current = state.routes.find((route, i) => {
    return state.index === i
  })

  if (!current) {
    return null
  }

  let renderedElement = descriptors[current.key]?.render() ?? null

  if (flags.experimentalPreventLayoutRemounting && renderedElement !== null) {
    // To save unnecessary re-mounting since the Slot navigator will only render one screen at a time anyway.
    renderedElement = {
      ...renderedElement,
      key: 'one-uses-a-static-key-here-for-slot-navigator',
    }
  }

  return renderedElement
}

/** Renders the currently selected content. */
export const Slot = React.memo(function Slot(props: Omit<NavigatorProps, 'children'>) {
  const contextKey = useContextKey()
  const context = React.useContext(NavigatorContext)

  // Ensure the context is for the current contextKey
  if (context?.contextKey !== contextKey) {
    // Qualify the content and re-export.
    return (
      <Navigator {...props}>
        <QualifiedSlot />
      </Navigator>
    )
  }

  return <QualifiedSlot />
})

export function QualifiedSlot() {
  return useSlot()
}

export function DefaultNavigator() {
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <Navigator>
        <QualifiedSlot />
      </Navigator>
    </SafeAreaView>
  )
}

Navigator.Slot = Slot
Navigator.useContext = useNavigatorContext

/** Used to configure route settings. */
Navigator.Screen = Screen
