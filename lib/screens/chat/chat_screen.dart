import 'package:flutter/material.dart';
import 'package:echomatch/models/chat_message.dart';
import 'package:echomatch/models/match.dart';
import 'package:echomatch/models/user.dart';
import 'package:echomatch/services/auth_service.dart';
import 'package:echomatch/services/chat_service.dart';
import 'package:echomatch/services/match_service.dart';
import 'package:echomatch/services/user_service.dart';
import 'package:echomatch/theme.dart';

class ChatScreen extends StatefulWidget {
  final String matchId;

  const ChatScreen({super.key, required this.matchId});

  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  final _authService = AuthService();
  final _chatService = ChatService();
  final _matchService = MatchService();
  final _userService = UserService();
  final _messageController = TextEditingController();
  
  Match? _match;
  User? _otherUser;
  List<ChatMessage> _messages = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadData();
    _chatService.addListener(_onChatUpdate);
  }

  @override
  void dispose() {
    _messageController.dispose();
    _chatService.removeListener(_onChatUpdate);
    super.dispose();
  }

  void _onChatUpdate() {
    _loadMessages();
  }

  Future<void> _loadData() async {
    setState(() => _isLoading = true);
    
    final match = await _matchService.getMatchById(widget.matchId);
    if (match != null) {
      final otherUserId = match.getOtherUserId(_authService.currentUser!.id);
      final otherUser = await _userService.getUserById(otherUserId);
      
      if (match.status == MatchStatus.active) {
        await _matchService.updateMatchStatus(match.id, MatchStatus.chatted);
      }
      
      setState(() {
        _match = match;
        _otherUser = otherUser;
      });
      
      await _loadMessages();
    }
    
    setState(() => _isLoading = false);
  }

  Future<void> _loadMessages() async {
    final messages = await _chatService.getMessagesForMatch(widget.matchId);
    setState(() => _messages = messages);
  }

  Future<void> _sendMessage() async {
    if (_messageController.text.trim().isEmpty) return;

    final text = _messageController.text.trim();
    _messageController.clear();

    await _chatService.sendMessage(widget.matchId, _authService.currentUser!.id, text);
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading || _match == null || _otherUser == null) {
      return Scaffold(
        appBar: AppBar(),
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(_otherUser!.username),
            Text('@${_otherUser!.username}', style: context.textStyles.bodySmall),
          ],
        ),
      ),
      body: Column(
        children: [
          Container(
            padding: AppSpacing.paddingSm,
            color: Colors.orange.withValues(alpha: 0.1),
            child: Row(
              children: [
                const Icon(Icons.timer, size: 16),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'Match expires in ${_match!.expiresAt.difference(DateTime.now()).inHours} hours',
                    style: context.textStyles.bodySmall,
                  ),
                ),
              ],
            ),
          ),
          Expanded(
            child: _messages.isEmpty
                ? Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.chat_bubble_outline, size: 64, color: Colors.grey),
                        const SizedBox(height: 16),
                        Text('Start the conversation!', style: context.textStyles.titleMedium),
                      ],
                    ),
                  )
                : ListView.builder(
                    padding: AppSpacing.paddingMd,
                    itemCount: _messages.length,
                    itemBuilder: (context, index) {
                      final message = _messages[index];
                      final isMine = message.senderId == _authService.currentUser!.id;
                      
                      return Align(
                        alignment: isMine ? Alignment.centerRight : Alignment.centerLeft,
                        child: Container(
                          margin: const EdgeInsets.only(bottom: 12),
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                          constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.7),
                          decoration: BoxDecoration(
                            color: isMine ? Theme.of(context).colorScheme.primary : Theme.of(context).colorScheme.surfaceContainerHighest,
                            borderRadius: BorderRadius.circular(16),
                          ),
                          child: Text(
                            message.messageText,
                            style: context.textStyles.bodyMedium?.withColor(isMine ? Colors.white : Theme.of(context).colorScheme.onSurface),
                          ),
                        ),
                      );
                    },
                  ),
          ),
          Container(
            padding: AppSpacing.paddingMd,
            decoration: BoxDecoration(
              color: Theme.of(context).colorScheme.surface,
              boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 10)],
            ),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _messageController,
                    decoration: InputDecoration(
                      hintText: 'Type a message...',
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(24)),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                IconButton.filled(
                  onPressed: _sendMessage,
                  icon: const Icon(Icons.send),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
