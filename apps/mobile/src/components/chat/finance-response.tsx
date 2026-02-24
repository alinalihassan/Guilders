import { Text, View, useColorScheme } from 'react-native';
import { Colors, Spacing } from '@/constants/theme';

type ColorSet = (typeof Colors)['light'] | (typeof Colors)['dark'];

interface FinanceResponseProps {
  type: 'finance_summary' | 'spending_chart' | 'account_breakdown' | 'text';
  data?: any;
  colors: ColorSet;
}

export function FinanceResponse({ type, data, colors }: FinanceResponseProps) {
  if (type === 'text') {
    return (
      <View
        style={{
          backgroundColor: colors.backgroundElement,
          paddingVertical: Spacing.two + 4,
          paddingHorizontal: Spacing.three,
          borderRadius: 18,
          borderBottomLeftRadius: 4,
        }}>
        <Text style={{ fontSize: 15, color: colors.text, lineHeight: 20 }}>
          {data?.content || 'No content'}
        </Text>
      </View>
    );
  }

  if (type === 'finance_summary') {
    return (
      <View
        style={{
          backgroundColor: colors.backgroundElement,
          borderRadius: 16,
          padding: Spacing.three,
          minWidth: 250,
        }}>
        <Text
          style={{
            fontSize: 13,
            fontWeight: '500',
            color: colors.textSecondary,
            textTransform: 'uppercase',
            letterSpacing: 0.4,
            marginBottom: Spacing.two,
          }}>
          Financial Summary
        </Text>
        <View style={{ gap: Spacing.two }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 14, color: colors.textSecondary }}>Total Assets</Text>
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#22C55E' }}>
              {data?.totalAssets || '$0.00'}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 14, color: colors.textSecondary }}>Total Liabilities</Text>
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#EF4444' }}>
              {data?.totalLiabilities || '$0.00'}
            </Text>
          </View>
          <View
            style={{
              height: 1,
              backgroundColor: colors.backgroundSelected,
              marginVertical: Spacing.one,
            }}
          />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }}>Net Worth</Text>
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#208AEF' }}>
              {data?.netWorth || '$0.00'}
            </Text>
          </View>
        </View>
      </View>
    );
  }

  if (type === 'spending_chart') {
    const categories = data?.categories || [
      { name: 'Food', amount: 345, color: '#F59E0B' },
      { name: 'Shopping', amount: 289, color: '#8B5CF6' },
      { name: 'Transport', amount: 156, color: '#3B82F6' },
      { name: 'Entertainment', amount: 89, color: '#EC4899' },
      { name: 'Other', amount: 45, color: '#6B7280' },
    ];

    const total = categories.reduce((sum: number, cat: any) => sum + cat.amount, 0);

    return (
      <View
        style={{
          backgroundColor: colors.backgroundElement,
          borderRadius: 16,
          padding: Spacing.three,
          minWidth: 280,
        }}>
        <Text
          style={{
            fontSize: 13,
            fontWeight: '500',
            color: colors.textSecondary,
            textTransform: 'uppercase',
            letterSpacing: 0.4,
            marginBottom: Spacing.two,
          }}>
          Spending by Category
        </Text>

        <View style={{ gap: Spacing.two }}>
          {categories.map((category: any, index: number) => {
            const percentage = (category.amount / total) * 100;
            return (
              <View key={`${category.name}-${index}`} style={{ gap: Spacing.one }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 14, color: colors.text }}>{category.name}</Text>
                  <Text style={{ fontSize: 14, fontWeight: '500', color: colors.text }}>
                    €{category.amount}
                  </Text>
                </View>
                <View
                  style={{
                    height: 8,
                    backgroundColor: colors.backgroundSelected,
                    borderRadius: 4,
                    overflow: 'hidden',
                  }}>
                  <View
                    style={{
                      height: '100%',
                      width: `${percentage}%`,
                      backgroundColor: category.color,
                      borderRadius: 4,
                    }}
                  />
                </View>
              </View>
            );
          })}
        </View>

        <View
          style={{
            marginTop: Spacing.three,
            paddingTop: Spacing.two,
            borderTopWidth: 1,
            borderTopColor: colors.backgroundSelected,
          }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>Total</Text>
            <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>
              €{total.toFixed(2)}
            </Text>
          </View>
        </View>
      </View>
    );
  }

  if (type === 'account_breakdown') {
    const accounts = data?.accounts || data?.assets || [
      { name: 'Checking Account', value: 5234.67, type: 'cash' },
      { name: 'Savings', value: 12500.0, type: 'cash' },
      { name: 'Investment Portfolio', value: 8750.5, type: 'investment' },
    ];

    const totalValue = accounts.reduce((sum: number, account: any) => sum + account.value, 0);

    return (
      <View
        style={{
          backgroundColor: colors.backgroundElement,
          borderRadius: 16,
          padding: Spacing.three,
          minWidth: 280,
        }}>
        <Text
          style={{
            fontSize: 13,
            fontWeight: '500',
            color: colors.textSecondary,
            textTransform: 'uppercase',
            letterSpacing: 0.4,
            marginBottom: Spacing.two,
          }}>
          Account Breakdown
        </Text>

        <View style={{ gap: Spacing.two }}>
          {accounts.map((account: any, index: number) => (
            <View
              key={`${account.name}-${index}`}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingVertical: Spacing.one,
              }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two }}>
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    backgroundColor:
                      account.type === 'cash'
                        ? '#22C55E20'
                        : account.type === 'investment'
                          ? '#8B5CF620'
                          : '#F59E0B20',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}>
                  <Text style={{ fontSize: 16 }}>
                    {account.type === 'cash' ? '💵' : account.type === 'investment' ? '📈' : '🏦'}
                  </Text>
                </View>
                <View>
                  <Text style={{ fontSize: 14, fontWeight: '500', color: colors.text }}>
                    {account.name}
                  </Text>
                  <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                    {account.type.charAt(0).toUpperCase() + account.type.slice(1)}
                  </Text>
                </View>
              </View>
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>
                €{account.value.toFixed(2)}
              </Text>
            </View>
          ))}
        </View>

        <View
          style={{
            marginTop: Spacing.three,
            paddingTop: Spacing.two,
            borderTopWidth: 1,
            borderTopColor: colors.backgroundSelected,
          }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }}>Total</Text>
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#208AEF' }}>
              €{totalValue.toFixed(2)}
            </Text>
          </View>
        </View>
      </View>
    );
  }

  return null;
}
