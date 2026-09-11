import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Colors } from '../../constants/theme';

export function SkeletonList() {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={Colors.secondary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
