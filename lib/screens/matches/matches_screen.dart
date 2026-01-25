import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:echomatch/models/match.dart';
import 'package:echomatch/models/user.dart';
import 'package:echomatch/services/auth_service.dart';
import 'package:echomatch/services/match_service.dart';
import 'package:echomatch/services/user_service.dart';
import 'package:echomatch/theme.dart';

class MatchesScreen extends StatefulWidget {
  const MatchesScreen({super.key});

  @override
  State<MatchesScreen> createState() => _MatchesScreenState();
}

class _MatchesScreenState extends State<MatchesScreen> {
  final _authService = AuthService();
  final _matchService = MatchService();
  final _userService = UserService();
  
  List<Match> _matches = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadMatches();
  }

  Future<void> _loadMatches() async {
    setState(() => _isLoading = true);
    
    final user = _authService.currentUser;
    if (user != null) {
      final matches = await _matchService.getUserMatches(user.id);
      setState(() {
        _matches = matches;
        _isLoading = false;
      });
    } else {
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Your Matches')),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _matches.isEmpty
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.favorite_border, size: 64, color: Colors.grey),
                      const SizedBox(height: 16),
                      Text('No matches yet', style: context.textStyles.titleLarge),
                      const SizedBox(height: 8),
                      Text('Play games to meet new people!', style: context.textStyles.bodyMedium),
                    ],
                  ),
                )
              : RefreshIndicator(
                  onRefresh: _loadMatches,
                  child: ListView.builder(
                    padding: AppSpacing.paddingMd,
                    itemCount: _matches.length,
                    itemBuilder: (context, index) {
                      final match = _matches[index];
                      final otherUserId = match.getOtherUserId(_authService.currentUser!.id);
                      
                      return FutureBuilder<User?>(
                        future: _userService.getUserById(otherUserId),
                        builder: (context, snapshot) {
                          final user = snapshot.data;
                          if (user == null) return const SizedBox();
                          
                          final hoursLeft = match.expiresAt.difference(DateTime.now()).inHours;
                          final expired = hoursLeft <= 0;
                          
                          return Card(
                            margin: const EdgeInsets.only(bottom: 12),
                            child: ListTile(
                              leading: CircleAvatar(
                                radius: 28,
                                child: Text(user.username.isNotEmpty ? user.username[0] : '?', style: context.textStyles.titleLarge),
                              ),
                              title: Text(user.username, style: context.textStyles.titleMedium?.semiBold),
                              subtitle: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const SizedBox(height: 4),
                                  Text(user.bio ?? '@${user.username}', maxLines: 1, overflow: TextOverflow.ellipsis),
                                  const SizedBox(height: 4),
                                  Text(expired ? '⏰ Expired' : '⏰ Expires in $hoursLeft hours', style: TextStyle(color: expired ? Colors.red : Colors.orange)),
                                ],
                              ),
                              trailing: expired ? null : const Icon(Icons.chat_bubble, color: Colors.blue),
                              onTap: expired ? null : () => context.push('/chat/${match.id}'),
                            ),
                          );
                        },
                      );
                    },
                  ),
                ),
    );
  }
}
