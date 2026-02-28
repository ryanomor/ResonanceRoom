import 'dart:async';
import 'package:flutter/material.dart';
import 'package:echomatch/theme.dart';
import 'package:echomatch/services/venue_search_service.dart';
import 'package:go_router/go_router.dart';

class VenuePickerSheet extends StatefulWidget {
  final String? initialQuery;
  final String? proximityCity;

  const VenuePickerSheet({super.key, this.initialQuery, this.proximityCity});

  static Future<String?> show(BuildContext context, {String? initialQuery, String? proximityCity}) =>
      showModalBottomSheet<String>(
        context: context,
        isScrollControlled: true,
        showDragHandle: true,
        useSafeArea: true,
        backgroundColor: Theme.of(context).colorScheme.surface,
        builder: (_) => VenuePickerSheet(initialQuery: initialQuery, proximityCity: proximityCity),
      );

  @override
  State<VenuePickerSheet> createState() => _VenuePickerSheetState();
}

class _VenuePickerSheetState extends State<VenuePickerSheet> {
  final _controller = TextEditingController();
  final _focusNode = FocusNode();
  final _service = VenueSearchService();

  List<VenueSuggestion> _suggestions = const [];
  VenueSuggestion? _selected;
  bool _loading = false;
  Timer? _debounce;

  @override
  void initState() {
    super.initState();
    if (widget.initialQuery != null && widget.initialQuery!.trim().isNotEmpty) {
      _controller.text = widget.initialQuery!.trim();
    }
    WidgetsBinding.instance.addPostFrameCallback((_) => _focusNode.requestFocus());
  }

  void _onChanged(String value) {
    _debounce?.cancel();
    if (value.trim().length < 2) {
      setState(() {
        _suggestions = const [];
        _loading = false;
      });
      return;
    }
    setState(() => _loading = true);
    _debounce = Timer(const Duration(milliseconds: 300), () async {
      final results = await _service.searchVenues(value.trim(), proximityCity: widget.proximityCity);
      if (!mounted) return;
      setState(() {
        _suggestions = results;
        _loading = false;
      });
    });
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _controller.dispose();
    _focusNode.dispose();
    super.dispose();
  }

  void _useVenue() {
    final address = _selected?.fullAddress ?? _controller.text.trim();
    if (address.isEmpty) return;
    context.pop(address);
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final hasSelection = _selected != null || _controller.text.trim().isNotEmpty;

    return SafeArea(
      top: false,
      child: Padding(
        padding: EdgeInsets.only(
          left: AppSpacing.lg,
          right: AppSpacing.lg,
          top: AppSpacing.lg,
          bottom: MediaQuery.viewInsetsOf(context).bottom + AppSpacing.lg,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text('Choose a venue', style: context.textStyles.titleLarge?.bold),
            const SizedBox(height: 8),
            Text(
              widget.proximityCity != null
                  ? 'Search bars, restaurants, event spaces near ${widget.proximityCity}'
                  : 'Search for a bar, restaurant, or event space',
              style: context.textStyles.bodyMedium?.withColor(cs.onSurfaceVariant),
            ),
            const SizedBox(height: 16),
            Container(
              decoration: BoxDecoration(color: cs.surfaceContainerHighest, borderRadius: BorderRadius.circular(14)),
              padding: const EdgeInsets.symmetric(horizontal: 12),
              child: Row(children: [
                Icon(Icons.place_outlined, color: cs.primary),
                const SizedBox(width: 8),
                Expanded(
                  child: TextField(
                    controller: _controller,
                    focusNode: _focusNode,
                    onChanged: _onChanged,
                    decoration: const InputDecoration(hintText: 'e.g. The Rusty Anchor, 123 Main St', border: InputBorder.none),
                  ),
                ),
                if (_loading)
                  Padding(
                    padding: const EdgeInsets.only(left: 8),
                    child: SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: cs.primary)),
                  )
                else if (_controller.text.isNotEmpty)
                  IconButton(
                    tooltip: 'Clear',
                    onPressed: () {
                      _controller.clear();
                      setState(() {
                        _suggestions = const [];
                        _selected = null;
                      });
                      _focusNode.requestFocus();
                    },
                    icon: Icon(Icons.close, color: cs.onSurfaceVariant),
                  ),
              ]),
            ),
            const SizedBox(height: 12),
            if (_suggestions.isNotEmpty)
              ConstrainedBox(
                constraints: const BoxConstraints(maxHeight: 300),
                child: ListView.separated(
                  shrinkWrap: true,
                  itemCount: _suggestions.length,
                  separatorBuilder: (_, __) => Divider(height: 1, color: cs.outline.withValues(alpha: 0.2)),
                  itemBuilder: (context, index) {
                    final v = _suggestions[index];
                    final isSelected = _selected?.fullAddress == v.fullAddress;
                    final addressWithoutName = v.fullAddress.startsWith(v.name)
                        ? v.fullAddress.substring(v.name.length).replaceFirst(RegExp(r'^,\s*'), '')
                        : v.fullAddress;
                    return ListTile(
                      contentPadding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      leading: CircleAvatar(
                        backgroundColor: isSelected ? cs.primary : cs.surfaceContainerHighest,
                        radius: 18,
                        child: Icon(
                          Icons.place,
                          color: isSelected ? cs.onPrimary : cs.onSurfaceVariant,
                          size: 18,
                        ),
                      ),
                      title: Text(v.name, maxLines: 1, overflow: TextOverflow.ellipsis, style: context.textStyles.bodyMedium?.semiBold),
                      subtitle: addressWithoutName.isNotEmpty
                          ? Text(addressWithoutName, maxLines: 2, overflow: TextOverflow.ellipsis, style: context.textStyles.labelSmall?.withColor(cs.onSurfaceVariant))
                          : null,
                      onTap: () => setState(() {
                        _selected = v;
                        _controller.text = v.name;
                      }),
                    );
                  },
                ),
              )
            else if (_controller.text.trim().length >= 2 && !_loading)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 8),
                child: Text('No venues found — try a street address', style: context.textStyles.labelSmall?.withColor(cs.onSurfaceVariant)),
              ),
            const SizedBox(height: 12),
            if (hasSelection)
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(color: cs.surfaceContainerHighest, borderRadius: BorderRadius.circular(12)),
                child: Row(children: [
                  Icon(Icons.place, color: cs.primary),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      _selected?.fullAddress ?? _controller.text.trim(),
                      maxLines: 3,
                      overflow: TextOverflow.ellipsis,
                      style: context.textStyles.bodySmall,
                    ),
                  ),
                ]),
              ),
            const SizedBox(height: 12),
            Row(children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: () => context.pop(),
                  icon: Icon(Icons.close, color: cs.primary),
                  label: const Text('Cancel'),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: FilledButton.icon(
                  onPressed: hasSelection && !_loading ? _useVenue : null,
                  icon: Icon(Icons.check, color: cs.onPrimary),
                  label: const Text('Use venue'),
                ),
              ),
            ]),
          ],
        ),
      ),
    );
  }
}
