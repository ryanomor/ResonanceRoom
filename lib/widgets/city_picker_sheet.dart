import 'dart:async';
import 'package:flutter/material.dart';
import 'package:echomatch/theme.dart';
import 'package:echomatch/services/city_validation_service.dart';
import 'package:echomatch/data/popular_cities.dart';
import 'package:go_router/go_router.dart';

class CityPickerSheet extends StatefulWidget {
  final String? initialQuery;

  const CityPickerSheet({super.key, this.initialQuery});

  static Future<String?> show(BuildContext context, {String? initialQuery}) =>
      showModalBottomSheet<String>(
        context: context,
        isScrollControlled: true,
        showDragHandle: true,
        useSafeArea: true,
        backgroundColor: Theme.of(context).colorScheme.surface,
        builder: (_) => CityPickerSheet(initialQuery: initialQuery),
      );

  @override
  State<CityPickerSheet> createState() => _CityPickerSheetState();
}

class _CityPickerSheetState extends State<CityPickerSheet> {
  final _controller = TextEditingController();
  final _focusNode = FocusNode();
  final _service = CityValidationService();

  List<String> _suggestions = const [];
  String? _selected;
  bool _loading = false;
  bool _usingLive = false;
  Timer? _debounce;

  @override
  void initState() {
    super.initState();
    if (widget.initialQuery != null && widget.initialQuery!.trim().isNotEmpty) {
      _controller.text = widget.initialQuery!.trim();
      _filterStatic(widget.initialQuery!.trim());
    } else {
      _suggestions = kPopularCities;
    }
    WidgetsBinding.instance.addPostFrameCallback((_) => _focusNode.requestFocus());
  }

  void _filterStatic(String query) {
    final q = query.trim().toLowerCase();
    if (q.isEmpty) {
      setState(() {
        _suggestions = kPopularCities;
        _usingLive = false;
        _loading = false;
      });
      return;
    }

    final staticMatches = kPopularCities
        .where((c) => c.toLowerCase().contains(q))
        .toList(growable: false);

    if (staticMatches.isNotEmpty) {
      setState(() {
        _suggestions = staticMatches;
        _usingLive = false;
        _loading = false;
      });
      _debounce?.cancel();
    } else {
      if (query.trim().length >= 2) {
        setState(() {
          _suggestions = const [];
          _loading = true;
          _usingLive = true;
        });
        _debounce?.cancel();
        _debounce = Timer(const Duration(milliseconds: 350), () async {
          final results = await _service.searchCities(query.trim());
          if (!mounted) return;
          setState(() {
            _suggestions = results;
            _loading = false;
          });
        });
      } else {
        setState(() {
          _suggestions = const [];
          _usingLive = false;
          _loading = false;
        });
      }
    }
  }

  void _onChanged(String value) => _filterStatic(value);

  @override
  void dispose() {
    _debounce?.cancel();
    _controller.dispose();
    _focusNode.dispose();
    super.dispose();
  }

  void _useCity() {
    final chosen = _selected ?? _controller.text.trim();
    if (chosen.isEmpty) return;
    context.pop(chosen);
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final hasValue = _selected != null || _controller.text.trim().isNotEmpty;

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
            Text('Select your city', style: context.textStyles.titleLarge?.bold),
            const SizedBox(height: 8),
            Text(
              _usingLive ? 'Searching cities worldwide...' : 'Popular cities — or type to search anywhere',
              style: context.textStyles.bodyMedium?.withColor(cs.onSurfaceVariant),
            ),
            const SizedBox(height: 16),
            Container(
              decoration: BoxDecoration(color: cs.surfaceContainerHighest, borderRadius: BorderRadius.circular(14)),
              padding: const EdgeInsets.symmetric(horizontal: 12),
              child: Row(children: [
                Icon(Icons.location_city, color: cs.primary),
                const SizedBox(width: 8),
                Expanded(
                  child: TextField(
                    controller: _controller,
                    focusNode: _focusNode,
                    onChanged: _onChanged,
                    decoration: const InputDecoration(hintText: 'Start typing your city', border: InputBorder.none),
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
                        _suggestions = kPopularCities;
                        _selected = null;
                        _usingLive = false;
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
                    final s = _suggestions[index];
                    final parts = s.split(',');
                    final city = parts.first.trim();
                    final rest = parts.skip(1).join(',').trim();
                    final isSelected = s == _selected || city == _selected;
                    return ListTile(
                      contentPadding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                      leading: Icon(
                        isSelected ? Icons.radio_button_checked : Icons.radio_button_off,
                        color: isSelected ? cs.primary : cs.onSurfaceVariant,
                      ),
                      title: Text(city, maxLines: 1, overflow: TextOverflow.ellipsis),
                      subtitle: rest.isNotEmpty
                          ? Text(rest, maxLines: 1, overflow: TextOverflow.ellipsis, style: context.textStyles.labelSmall?.withColor(cs.onSurfaceVariant))
                          : null,
                      onTap: () {
                        setState(() {
                          _selected = city;
                          _controller.text = city;
                        });
                      },
                    );
                  },
                ),
              )
            else if (_controller.text.trim().length >= 2 && !_loading)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 8),
                child: Text('No cities found', style: context.textStyles.labelSmall?.withColor(cs.onSurfaceVariant)),
              ),
            const SizedBox(height: 12),
            if (hasValue)
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(color: cs.surfaceContainerHighest, borderRadius: BorderRadius.circular(12)),
                child: Row(children: [
                  Icon(Icons.location_city, color: cs.primary),
                  const SizedBox(width: 8),
                  Expanded(child: Text((_selected ?? _controller.text).trim(), maxLines: 2, overflow: TextOverflow.ellipsis)),
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
                  onPressed: hasValue && !_loading ? _useCity : null,
                  icon: Icon(Icons.check, color: cs.onPrimary),
                  label: const Text('Use city'),
                ),
              ),
            ]),
          ],
        ),
      ),
    );
  }
}
