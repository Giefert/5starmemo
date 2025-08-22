import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';

interface StudyCompletedScreenProps {
  stats: {
    studied: number;
    correct: number;
    total: number;
  };
  deckTitle?: string;
  onContinue: () => void;
  onStudyAgain?: () => void;
}

export const StudyCompletedScreen: React.FC<StudyCompletedScreenProps> = ({
  stats,
  deckTitle,
  onContinue,
  onStudyAgain,
}) => {
  const accuracyPercentage = stats.studied > 0 
    ? Math.round((stats.correct / stats.studied) * 100) 
    : 0;

  const getPerformanceMessage = () => {
    if (accuracyPercentage >= 90) return "Excellent work! 🎉";
    if (accuracyPercentage >= 75) return "Great job! 👍";
    if (accuracyPercentage >= 60) return "Good progress! 📈";
    if (accuracyPercentage >= 40) return "Keep practicing! 💪";
    return "Don't give up! 🌟";
  };

  const getPerformanceColor = () => {
    if (accuracyPercentage >= 75) return '#34C759';
    if (accuracyPercentage >= 50) return '#FF9500';
    return '#FF3B30';
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Study Complete!</Text>
          {deckTitle && (
            <Text style={styles.deckTitle}>{deckTitle}</Text>
          )}
        </View>

        {/* Performance Summary */}
        <View style={styles.summaryCard}>
          <Text style={[styles.performanceMessage, { color: getPerformanceColor() }]}>
            {getPerformanceMessage()}
          </Text>
          
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{stats.studied}</Text>
              <Text style={styles.statLabel}>Cards Studied</Text>
            </View>
            
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: getPerformanceColor() }]}>
                {stats.correct}
              </Text>
              <Text style={styles.statLabel}>Correct</Text>
            </View>
            
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: getPerformanceColor() }]}>
                {accuracyPercentage}%
              </Text>
              <Text style={styles.statLabel}>Accuracy</Text>
            </View>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressSection}>
            <Text style={styles.progressLabel}>Session Progress</Text>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill,
                  { 
                    width: `${(stats.studied / stats.total) * 100}%`,
                    backgroundColor: getPerformanceColor()
                  }
                ]}
              />
            </View>
            <Text style={styles.progressText}>
              {stats.studied} of {stats.total} cards completed
            </Text>
          </View>
        </View>

        {/* FSRS Information */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>What's Next?</Text>
          <Text style={styles.infoText}>
            Based on your performance, the FSRS algorithm has scheduled when you'll see these cards again for optimal learning.
          </Text>
          <Text style={styles.infoText}>
            Cards you found difficult will appear sooner, while easy cards will have longer intervals.
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          {onStudyAgain && stats.studied < stats.total && (
            <TouchableOpacity 
              style={[styles.button, styles.secondaryButton]} 
              onPress={onStudyAgain}
            >
              <Text style={styles.secondaryButtonText}>Study More Cards</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity 
            style={[styles.button, styles.primaryButton]} 
            onPress={onContinue}
          >
            <Text style={styles.primaryButtonText}>Continue</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 8,
  },
  deckTitle: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
  },
  summaryCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  performanceMessage: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 24,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 24,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  progressSection: {
    marginTop: 16,
  },
  progressLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
    textAlign: 'center',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  infoCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 8,
  },
  buttonContainer: {
    gap: 12,
  },
  button: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#007AFF',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  secondaryButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
});