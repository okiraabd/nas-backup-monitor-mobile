import { StyleSheet } from 'react-native';

import { colors, spacing } from '@/src/theme/colors';

/**
 * Style bersama untuk Modal bottom-sheet yang dipakai di lebih dari satu screen.
 * Import file ini di screen yang menampilkan modal, lalu gunakan sebagai:
 *   <View style={modalStyles.backdrop}>
 *     <Card style={modalStyles.card}>
 *       ...
 *       <View style={modalStyles.fieldWrap}> ... </View>
 *       <AppText style={modalStyles.error}> ... </AppText>
 *       <View style={modalStyles.actions}> ... </View>
 *     </Card>
 *   </View>
 */
export const modalStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: `${colors.black}99`,
    justifyContent: 'flex-end',
    padding: spacing.lg,
  },
  card: {
    gap: spacing.lg,
  },
  fieldWrap: {
    gap: spacing.xs,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  error: {
    color: colors.destructiveBright,
    fontSize: 12,
  },
});
