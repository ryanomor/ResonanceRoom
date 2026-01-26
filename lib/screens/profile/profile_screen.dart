import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:echomatch/models/user.dart';
import 'package:echomatch/services/auth_service.dart';
import 'package:echomatch/theme.dart';
import 'package:echomatch/widgets/city_picker_sheet.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  Future<void> _handleLogout() async {
    await context.read<AuthService>().signOut();
    if (mounted) context.go('/login');
  }

  Future<void> _confirmDelete() async {
    final auth = context.read<AuthService>();
    final theme = Theme.of(context);
    final confirmed = await showModalBottomSheet<bool>(
      context: context,
      backgroundColor: theme.colorScheme.surface,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) {
        return Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(children: [
                Icon(Icons.delete_forever_rounded, color: theme.colorScheme.error),
                const SizedBox(width: 12),
                Text('Delete account?', style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700)),
              ]),
              const SizedBox(height: 12),
              Text(
                'This action is permanent. Your profile, matches, and chats will be removed. You can\'t undo this.',
                style: theme.textTheme.bodyMedium?.copyWith(color: theme.colorScheme.onSurfaceVariant),
              ),
              const SizedBox(height: 20),
              Row(children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () => Navigator.of(ctx).pop(false),
                    icon: Icon(Icons.close_rounded, color: theme.colorScheme.primary),
                    label: const Text('Cancel'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(backgroundColor: theme.colorScheme.error, foregroundColor: Colors.white),
                    onPressed: () => Navigator.of(ctx).pop(true),
                    icon: const Icon(Icons.delete_outline_rounded),
                    label: const Text('Delete'),
                  ),
                ),
              ]),
              const SizedBox(height: 6),
            ],
          ),
        );
      },
    );

    if (confirmed == true) {
      final ok = await auth.deleteAccount();
      if (!mounted) return;
      if (ok) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Account deleted')));
        context.go('/login');
      } else {
        final err = auth.error ?? 'Failed to delete account';
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(err)));
      }
    }
  }

  Future<void> _editCity(User user) async {
    final selected = await CityPickerSheet.show(context, initialQuery: user.city.split(',').first.trim());
    if (!mounted || selected == null) return;

    try {
      final auth = context.read<AuthService>();
      await auth.updateProfile(user.copyWith(city: selected, updatedAt: DateTime.now()));
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('City updated')));
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Failed to update city: $e')));
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthService>();
    final user = auth.currentUser;

    if (user == null) {
      return Scaffold(appBar: AppBar(), body: const Center(child: Text('Not logged in')));
    }

    return Scaffold(
      appBar: AppBar(title: const Text('Profile')),
      body: SingleChildScrollView(
        padding: AppSpacing.paddingLg,
        child: Column(
          children: [
            CircleAvatar(
              radius: 60,
              backgroundColor: Theme.of(context).colorScheme.primaryContainer,
              child: Text(user.username.isNotEmpty ? user.username[0] : '?', style: context.textStyles.displayMedium?.bold.withColor(Theme.of(context).colorScheme.primary)),
            ),
            const SizedBox(height: 16),
            Text(user.username, style: context.textStyles.headlineMedium?.bold),
            const SizedBox(height: 8),
            Text('@${user.username}', style: context.textStyles.bodyLarge?.withColor(Theme.of(context).colorScheme.onSurfaceVariant)),
            const SizedBox(height: 24),
            if (user.bio != null) ...[
              Text(user.bio!, style: context.textStyles.bodyMedium, textAlign: TextAlign.center),
              const SizedBox(height: 24),
            ],
            Card(
              child: Padding(
                padding: AppSpacing.paddingMd,
                child: Column(
                  children: [
                    Row(
                      children: [
                        Expanded(child: _StatRow(label: 'City', value: user.city)),
                        IconButton(
                          tooltip: 'Edit city',
                          onPressed: () => _editCity(user),
                          icon: Icon(Icons.edit_location_alt_outlined, color: Theme.of(context).colorScheme.primary),
                        ),
                      ],
                    ),
                    const Divider(),
                    _StatRow(label: 'Gender', value: user.gender.name[0].toUpperCase() + user.gender.name.substring(1)),
                    const Divider(),
                    _StatRow(label: 'Email', value: user.email),
                    const Divider(),
                    _StatRow(label: 'Games Played', value: '${user.totalGamesPlayed}'),
                    const Divider(),
                    _StatRow(label: 'Total Matches', value: '${user.totalMatches}'),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 32),
            ElevatedButton.icon(
              onPressed: auth.isLoading ? null : _handleLogout,
              icon: const Icon(Icons.logout),
              label: const Text('Sign Out'),
              style: ElevatedButton.styleFrom(
                backgroundColor: Theme.of(context).colorScheme.error,
                foregroundColor: Colors.white,
              ),
            ),
            const SizedBox(height: 12),
            OutlinedButton.icon(
              onPressed: auth.isLoading ? null : _confirmDelete,
              icon: Icon(Icons.delete_forever, color: Theme.of(context).colorScheme.error),
              label: Text('Delete Account', style: TextStyle(color: Theme.of(context).colorScheme.error)),
            ),
          ],
        ),
      ),
    );
  }
}

class _StatRow extends StatelessWidget {
  final String label;
  final String value;

  const _StatRow({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: context.textStyles.bodyMedium?.semiBold),
          Text(value, style: context.textStyles.bodyMedium),
        ],
      ),
    );
  }
}
